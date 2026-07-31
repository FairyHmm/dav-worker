import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import {
  IdSchema,
  OccurrenceSchema,
  TitleSchema,
  DescriptionSchema,
  LocationFieldSchema,
  DateTimeSchema,
} from "../utils/schemas.js";
import { findEventAcrossCalendars, formatWarnings } from "../utils/find.js";
import {
  applyEventFields,
  findMasterEvent,
  findOccurrenceOverride,
  detachOccurrence,
} from "../utils/mapping.js";
import { parseCalendar, findAllComponents, stringifyCalendar } from "@dav-worker/calendar-ical";

export function registerScheduleUpdateTool(server: McpServer, deps: CalendarToolsDeps): void {
  server.registerTool(
    "schedule_update",
    {
      description:
        "Update a calendar event by id, changing only the fields provided.",
      annotations: {
        title: "Update Event",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        id: IdSchema,
        occurrence: OccurrenceSchema,
        title: TitleSchema.optional(),
        start: DateTimeSchema.optional(),
        end: DateTimeSchema.optional(),
        description: DescriptionSchema,
        location: LocationFieldSchema,
      },
    },
    async ({ id, occurrence, title, start, end, description, location }) => {
      try {
        const client = deps.storage;
        const { found, warnings } = await findEventAcrossCalendars(client, deps.config, "VEVENT", id);
        if (!found) {
          return err(new Error(`${formatWarnings(warnings)}No event found with id: ${id}`));
        }
        const { calendarName, entry } = found;
        if (!entry.calendarData) {
          return err(new Error(`Event ${id} has no calendar-data to update.`));
        }

        const cal = parseCalendar(entry.calendarData);
        const events = findAllComponents(cal, "VEVENT");
        if (events.length === 0) {
          return err(new Error(`Event ${id}'s iCalendar data has no VEVENT.`));
        }

        let target;
        if (occurrence === undefined) {
          target = findMasterEvent(events) ?? events[0];
        } else {
          target = findOccurrenceOverride(events, occurrence);
          if (!target) {
            const master = findMasterEvent(events);
            if (!master) {
              return err(
                new Error(
                  `Event ${id} has no recurring master to detach occurrence ${occurrence} from.`,
                ),
              );
            }
            target = detachOccurrence(master, occurrence);
            cal.components.push(target);
          }
        }

        applyEventFields(target, { title, start, end, description, location });
        const ics = stringifyCalendar(cal);
        await client.update(calendarName, "VEVENT", id, ics);

        const occNote = occurrence ? ` (occurrence ${occurrence})` : "";
        return ok(`${formatWarnings(warnings)}Updated event (id: ${id})${occNote} in ${calendarName}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
