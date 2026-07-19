import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { ok, err } from "../../utils.js";
import { IdSchema } from "./utils/schemas.js";
import { findEventAcrossCalendars } from "./utils/find.js";

export function registerScheduleDeleteTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_delete",
    {
      description:
        "Delete a calendar event by id, along with any travel-buffer " +
        "events linked to it (X-DAV-WORKER-TRAVEL-FOR). Searches all " +
        "configured calendars; no-ops silently if the id doesn't exist " +
        "anywhere (idempotent delete, per SPEC-SCHEDULES.md's status-code " +
        "contract).",
      inputSchema: { id: IdSchema },
    },
    async ({ id }) => {
      try {
        const client = new CalDAVClient(env);

        // Locate the calendar first (rather than blindly trying delete()
        // against every configured calendar) because travel-buffer cleanup
        // needs to know which single calendar to search for buffers in —
        // buffers always live alongside their parent, per SPEC-SCHEDULES.md.
        const found = await findEventAcrossCalendars(client, "VEVENT", id);
        if (!found) {
          return ok(`Deleted event (id: ${id}), if it existed.`);
        }
        const { calendarName } = found;

        const buffers = await client.findTravelBuffersFor(calendarName, id);
        await client.delete(calendarName, "VEVENT", id);
        for (const buf of buffers) {
          await client.deleteHref(buf.href);
        }

        const bufferNote = buffers.length
          ? ` and ${buffers.length} travel buffer${buffers.length > 1 ? "s" : ""}`
          : "";
        return ok(`Deleted event (id: ${id})${bufferNote}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
