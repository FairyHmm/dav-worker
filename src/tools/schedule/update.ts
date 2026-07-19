import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { ok, err } from "../../utils.js";
import {
  IdSchema,
  TitleSchema,
  DescriptionSchema,
  LocationFieldSchema,
  DateTimeSchema,
} from "./utils/schemas.js";
import { findEventAcrossCalendars } from "./utils/find.js";
import { applyEventFields } from "./utils/mapping.js";
import { parseCalendar } from "../../ical/parse.js";
import { findComponent } from "../../ical/component.js";
import { stringifyCalendar } from "../../ical/stringify.js";

export function registerScheduleUpdateTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_update",
    {
      description:
        "Update a calendar event by id, changing only the fields provided. " +
        "Searches all configured calendars for the id. Bulk update (array " +
        "input) is NOT implemented yet — single event only for now.",
      inputSchema: {
        id: IdSchema,
        title: TitleSchema.optional(),
        start: DateTimeSchema.optional(),
        end: DateTimeSchema.optional(),
        description: DescriptionSchema,
        location: LocationFieldSchema,
      },
    },
    async ({ id, title, start, end, description, location }) => {
      try {
        const client = new CalDAVClient(env);
        const found = await findEventAcrossCalendars(client, "VEVENT", id);
        if (!found) {
          return err(new Error(`No event found with id: ${id}`));
        }
        const { calendarName, entry } = found;
        if (!entry.calendarData) {
          return err(new Error(`Event ${id} has no calendar-data to update.`));
        }

        const cal = parseCalendar(entry.calendarData);
        const vevent = findComponent(cal, "VEVENT");
        if (!vevent) {
          return err(new Error(`Event ${id}'s iCalendar data has no VEVENT.`));
        }

        applyEventFields(vevent, { title, start, end, description, location });
        const ics = stringifyCalendar(cal);
        await client.update(calendarName, "VEVENT", id, ics);

        return ok(`Updated event (id: ${id}) in ${calendarName}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
