import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { ok, err } from "../../utils.js";
import {
  CategorySchema,
  TitleSchema,
  DescriptionSchema,
  LocationFieldSchema,
  DateTimeSchema,
} from "./utils/schemas.js";
import { resolveCalendarName } from "../../config/calendars.js";
import { buildEventComponent } from "./utils/mapping.js";
import { wrapInCalendar } from "../../ical/component.js";
import { stringifyCalendar } from "../../ical/stringify.js";

export function registerScheduleCreateTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_create",
    {
      description:
        "Create a calendar event. Travel buffers (a `travel` param generating " +
        "separate before/after buffer events) are NOT implemented yet — planned " +
        "as its own follow-up unit per TODO.md.",
      inputSchema: {
        title: TitleSchema,
        start: DateTimeSchema,
        end: DateTimeSchema,
        category: CategorySchema,
        description: DescriptionSchema,
        location: LocationFieldSchema,
      },
    },
    async ({ title, start, end, category, description, location }) => {
      try {
        const calendarName = resolveCalendarName(category);
        const uid = crypto.randomUUID();
        const event = buildEventComponent(uid, { title, start, end, description, location });
        const ics = stringifyCalendar(wrapInCalendar(event));

        const client = new CalDAVClient(env);
        await client.create(calendarName, uid, ics);

        return ok(`Created event "${title}" (id: ${uid}) in ${calendarName}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
