import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarToolsDeps } from "./deps.js";
import { ok, err } from "./utils.js";
import { IdSchema, OccurrenceSchema } from "./utils/schemas.js";
import { findEventAcrossCalendars, formatWarnings } from "./utils/find.js";
import { findMasterEvent, findOccurrenceOverride } from "./utils/mapping.js";
import { parseCalendar, findAllComponents, addExdate, stringifyCalendar } from "@dav-worker/calendar-ical";

export function registerScheduleDeleteTool(server: McpServer, deps: CalendarToolsDeps): void {
  server.registerTool(
    "nc_schedule_delete",
    {
      description:
        "Delete a calendar event by id, along with any travel-buffer " +
        "events linked to it (X-DAV-WORKER-TRAVEL-FOR). Searches all " +
        "configured calendars; no-ops silently if the id doesn't exist " +
        "anywhere (idempotent delete, per SPEC-SCHEDULES.md's status-code " +
        "contract). Omitting `occurrence` deletes the whole series (or a " +
        "non-recurring event); providing it skips just that one instance " +
        "of a recurring event (adds an EXDATE to the series — the series " +
        "and its other instances are untouched).",
      inputSchema: { id: IdSchema, occurrence: OccurrenceSchema },
    },
    async ({ id, occurrence }) => {
      try {
        const client = deps.storage;

        // Locate the calendar first (rather than blindly trying delete()
        // against every configured calendar) because travel-buffer cleanup
        // needs to know which single calendar to search for buffers in —
        // buffers always live alongside their parent, per SPEC-SCHEDULES.md.
        const { found, warnings } = await findEventAcrossCalendars(client, deps.config, "VEVENT", id);
        if (!found) {
          // If any calendar was skipped, this "if it existed" no-op is
          // exactly the case where a stale slug can quietly hide a real
          // event that never actually got deleted — surface it loudly
          // rather than reporting a clean success.
          return ok(`${formatWarnings(warnings)}Deleted event (id: ${id}), if it existed.`);
        }
        const { calendarName, entry } = found;

        if (occurrence !== undefined) {
          // Skipping one instance is an EXDATE on the master, not a
          // resource delete — PUT the modified series back.
          if (!entry.calendarData) {
            return err(new Error(`Event ${id} has no calendar-data to update.`));
          }
          const cal = parseCalendar(entry.calendarData);
          const events = findAllComponents(cal, "VEVENT");
          const master = findMasterEvent(events);
          if (!master) {
            return err(
              new Error(`Event ${id} has no recurring master; cannot skip occurrence ${occurrence}.`),
            );
          }
          addExdate(master, occurrence);

          // If this occurrence was previously edited (nc_schedule_update
          // detaches an edited occurrence into its own override VEVENT with
          // a RECURRENCE-ID), the EXDATE above only stops the master's RRULE
          // from regenerating it — it does nothing to the override itself,
          // which is a separate resource-level component and stays visible
          // regardless of EXDATE. Must remove it explicitly or "skip this
          // occurrence" silently fails for any occurrence that was ever
          // edited before being deleted.
          const override = findOccurrenceOverride(events, occurrence);
          if (override) {
            cal.components = cal.components.filter((c) => c !== override);
          }

          const ics = stringifyCalendar(cal);
          await client.update(calendarName, "VEVENT", id, ics);
          return ok(
            `${formatWarnings(warnings)}Skipped occurrence ${occurrence} of event (id: ${id}) in ${calendarName}.`,
          );
        }

        const buffers = await client.findTravelBuffersFor(calendarName, id);
        await client.delete(calendarName, "VEVENT", id);
        for (const buf of buffers) {
          await client.deleteHref(buf.href);
        }

        const bufferNote = buffers.length
          ? ` and ${buffers.length} travel buffer${buffers.length > 1 ? "s" : ""}`
          : "";
        return ok(`${formatWarnings(warnings)}Deleted event (id: ${id})${bufferNote}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
