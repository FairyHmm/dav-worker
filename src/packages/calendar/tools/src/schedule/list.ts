import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarToolsDeps } from "../deps.js";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import { ok, err } from "../utils.js";
import { categorySchema, TimeWindowSchema } from "../utils/schemas.js";
import { resolveCalendarName, allCalendarNames } from "../calendars.js";
import { resolveTimeWindow } from "../utils/time.js";
import { extractEventSummaries } from "../utils/mapping.js";
import { formatWarnings } from "../utils/find.js";
import type { EventSummary } from "../utils/mapping.js";

export function registerScheduleListTool(server: McpServer, deps: CalendarToolsDeps): void {
  server.registerTool(
    "schedule_list",
    {
      description:
        "List calendar events in a time window. Omit `category` to search all " +
        "configured calendars. Does not yet merge in related tasks (tools/tasks " +
        "isn't built yet) — that's a follow-up once task_* exists.",
      inputSchema: { time: TimeWindowSchema, category: categorySchema(deps.config).optional() },
    },
    async ({ time, category }) => {
      try {
        const { startUtc, endUtc } = resolveTimeWindow(time);
        const client = deps.storage;
        const calendarNames = category
          ? [resolveCalendarName(deps.config, category)]
          : allCalendarNames(deps.config);

        const results: Array<EventSummary & { calendar: string }> = [];
        const warnings: string[] = [];

        for (const calendarName of calendarNames) {
          let entries;
          try {
            entries = await client.listByTimeRange(calendarName, "VEVENT", startUtc, endUtc);
          } catch (e) {
            // A single misconfigured/missing calendar shouldn't take down
            // an "all calendars" listing — same reasoning as
            // findEventAcrossCalendars. Real errors still surface.
            if (e instanceof WebDAVHttpError && e.status === 404) {
              warnings.push(
                `Calendar "${calendarName}" returned 404 (its slug in calendars.toml may be ` +
                  `stale — check it against the calendar's actual URI on the server, e.g. ` +
                  `after a rename). Skipped for this listing.`,
              );
              continue;
            }
            throw e;
          }
          for (const entry of entries) {
            for (const summary of extractEventSummaries(entry)) {
              results.push({ ...summary, calendar: calendarName });
            }
          }
        }

        if (results.length === 0) return ok(`${formatWarnings(warnings)}No events found in this window.`);

        const lines = results.map((e) => {
          const idPart = e.occurrence ? `id: ${e.uid}, occurrence: ${e.occurrence}` : `id: ${e.uid}`;
          return `${e.start} – ${e.end}  ${e.title}  [${e.calendar}]  (${idPart})`;
        });
        return ok(`${formatWarnings(warnings)}${lines.join("\n")}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
