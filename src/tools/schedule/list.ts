import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { NextcloudHttpError } from "../../clients/base.js";
import { ok, err } from "../../utils.js";
import { CategorySchema, TimeWindowSchema } from "./utils/schemas.js";
import { resolveCalendarName, allCalendarNames } from "../../config/calendars.js";
import { resolveTimeWindow } from "./utils/time.js";
import { extractEventSummary } from "./utils/mapping.js";
import { formatWarnings } from "./utils/find.js";
import type { EventSummary } from "./utils/mapping.js";

export function registerScheduleListTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_list",
    {
      description:
        "List calendar events in a time window. Omit `category` to search all " +
        "configured calendars. Does not yet merge in related tasks (tools/tasks " +
        "isn't built yet) — that's a follow-up once nc_task_* exists.",
      inputSchema: { time: TimeWindowSchema, category: CategorySchema.optional() },
    },
    async ({ time, category }) => {
      try {
        const { startUtc, endUtc } = resolveTimeWindow(time);
        const client = new CalDAVClient(env);
        const calendarNames = category
          ? [resolveCalendarName(category)]
          : allCalendarNames();

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
            if (e instanceof NextcloudHttpError && e.status === 404) {
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
            const summary = extractEventSummary(entry);
            if (summary) results.push({ ...summary, calendar: calendarName });
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
