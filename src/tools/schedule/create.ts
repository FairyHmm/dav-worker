import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalDAVClient } from "../../clients/caldav/index.js";
import { ok, err } from "../../utils.js";
import {
  CategorySchema,
  TitleSchema,
  DescriptionSchema,
  LocationFieldSchema,
  DateTimeSchema,
  TravelSchema,
  RecurrenceSchema,
} from "./utils/schemas.js";
import { resolveCalendarName } from "../../config/calendars.js";
import { buildEventComponent, buildTravelBufferComponent, applyRecurrence } from "./utils/mapping.js";
import { parseDurationMs, shiftIso } from "./utils/time.js";
import { wrapInCalendar } from "../../ical/component.js";
import { stringifyCalendar } from "../../ical/stringify.js";

export function registerScheduleCreateTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_create",
    {
      description:
        "Create a calendar event. Optionally pass `travel` to also create " +
        "separate before/after travel-buffer events in the same calendar, " +
        "linked to this event via X-DAV-WORKER-TRAVEL-FOR. Optionally pass " +
        "`recurrence` for a daily/weekly repeating event.",
      inputSchema: {
        title: TitleSchema,
        start: DateTimeSchema,
        end: DateTimeSchema,
        category: CategorySchema,
        description: DescriptionSchema,
        location: LocationFieldSchema,
        travel: TravelSchema,
        recurrence: RecurrenceSchema,
      },
    },
    async ({ title, start, end, category, description, location, travel, recurrence }) => {
      try {
        const calendarName = resolveCalendarName(category);
        const uid = crypto.randomUUID();
        const event = buildEventComponent(uid, { title, start, end, description, location });
        if (recurrence) applyRecurrence(event, recurrence);
        const ics = stringifyCalendar(wrapInCalendar(event));

        const client = new CalDAVClient(env);
        await client.create(calendarName, uid, ics);

        // Travel buffers are separate VEVENTs, not folded into the main
        // event — this keeps them independently visible/movable in any
        // CalDAV client, and independently cleanable by nc_schedule_delete.
        const bufferKinds: string[] = [];
        if (travel?.before) {
          const bufMs = parseDurationMs(travel.before);
          const bufStart = shiftIso(start, -bufMs);
          const bufUid = crypto.randomUUID();
          const bufEvent = buildTravelBufferComponent(
            bufUid,
            uid,
            `Travel to ${title}`,
            bufStart,
            start,
          );
          await client.create(calendarName, bufUid, stringifyCalendar(wrapInCalendar(bufEvent)));
          bufferKinds.push("before");
        }
        if (travel?.after) {
          const bufMs = parseDurationMs(travel.after);
          const bufEnd = shiftIso(end, bufMs);
          const bufUid = crypto.randomUUID();
          const bufEvent = buildTravelBufferComponent(
            bufUid,
            uid,
            `Travel from ${title}`,
            end,
            bufEnd,
          );
          await client.create(calendarName, bufUid, stringifyCalendar(wrapInCalendar(bufEvent)));
          bufferKinds.push("after");
        }

        const suffix = bufferKinds.length
          ? ` (with ${bufferKinds.join(" and ")} travel buffer${bufferKinds.length > 1 ? "s" : ""})`
          : "";
        return ok(`Created event "${title}" (id: ${uid}) in ${calendarName}${suffix}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
