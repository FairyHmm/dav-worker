import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { ok, err } from "../../utils.js";
import { IdSchema } from "./utils/schemas.js";
import { allCalendarNames } from "../../config/calendars.js";

export function registerScheduleDeleteTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_delete",
    {
      description:
        "Delete a calendar event by id. Searches all configured calendars; " +
        "no-ops silently if the id doesn't exist anywhere (idempotent delete, " +
        "per SPEC-SCHEDULES.md's status-code contract). Does NOT yet clean up " +
        "associated travel-buffer events (X-DAV-WORKER-TRAVEL-FOR) — planned " +
        "as a follow-up unit alongside travel buffer creation.",
      inputSchema: { id: IdSchema },
    },
    async ({ id }) => {
      try {
        const client = new CalDAVClient(env);
        // delete() is a no-op per calendar when the uid isn't found there
        // (see SPEC-SCHEDULES.md's status-code contract), so trying every
        // configured calendar is safe — exactly one will actually delete.
        for (const calendarName of allCalendarNames()) {
          await client.delete(calendarName, "VEVENT", id);
        }
        return ok(`Deleted event (id: ${id}), if it existed.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
