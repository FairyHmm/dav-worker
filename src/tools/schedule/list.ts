import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { ok, err } from "../../utils.js";
import { CategorySchema, TimeWindowSchema } from "./utils/schemas.js";
import { resolveCalendarName, allCalendarNames } from "../../config/calendars.js";
import { resolveTimeWindow } from "./utils/time.js";
import { extractEventSummary } from "./utils/mapping.js";
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

        for (const calendarName of calendarNames) {
          const entries = await client.listByTimeRange(
            calendarName,
            "VEVENT",
            startUtc,
            endUtc,
          );
          for (const entry of entries) {
            const summary = extractEventSummary(entry);
            if (summary) results.push({ ...summary, calendar: calendarName });
          }
        }

        if (results.length === 0) return ok("No events found in this window.");

        const lines = results.map(
          (e) => `${e.start} – ${e.end}  ${e.title}  [${e.calendar}]  (id: ${e.uid})`,
        );
        return ok(lines.join("\n"));
      } catch (e) {
        return err(e);
      }
    },
  );
}
