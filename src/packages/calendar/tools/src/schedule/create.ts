import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { CalendarToolsDeps } from "../deps";
import { ok, err } from "@dav-worker/mcp-utils";
import {
  writeCategorySchema,
  TitleSchema,
  DescriptionSchema,
  LocationFieldSchema,
  DateTimeSchema,
  TravelSchema,
  RecurrenceSchema,
} from "../utils/schemas";
import { resolveCalendarName } from "../calendars";
import {
  buildEventComponent,
  buildTravelBufferComponent,
  applyRecurrence,
} from "../utils/mapping";
import { parseDurationMs, shiftIso } from "@dav-worker/time-utils";
import { wrapInCalendar, stringifyCalendar } from "@dav-worker/calendar-ical";
import {
  withBatchSupport,
  runBatchTool,
  required,
  locked,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape(deps: CalendarToolsDeps) {
  return {
    title: required(TitleSchema.optional()),
    start: required(DateTimeSchema.optional()),
    end: required(DateTimeSchema.optional()),
    // locked(): resolves to the calendar the event is physically written
    // into, so a batch shouldn't silently fan out across calendars.
    category: locked(required(writeCategorySchema(deps.config).optional())),
    description: DescriptionSchema,
    location: LocationFieldSchema,
    travel: TravelSchema,
    recurrence: RecurrenceSchema,
  };
}

type CreateItem = Resolved<
  ReturnType<typeof createItemShape>,
  "title" | "start" | "end" | "category"
>;

export function registerScheduleCreateTool(
  server: McpServer,
  deps: CalendarToolsDeps,
): void {
  const itemShape = createItemShape(deps);

  server.registerTool(
    "schedule_create",
    {
      description: "Create a calendar event.",
      annotations: {
        title: "Create Event",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: CreateItem) =>
        createEventItem(deps, item),
      ),
  );
}

async function createEventItem(deps: CalendarToolsDeps, item: CreateItem) {
  const {
    title,
    start,
    end,
    category,
    description,
    location,
    travel,
    recurrence,
  } = item;
  try {
    const calendarName = resolveCalendarName(deps.config, category);
    const uid = crypto.randomUUID();
    const event = buildEventComponent(uid, {
      title,
      start,
      end,
      description,
      location,
    });
    if (recurrence) applyRecurrence(event, recurrence);
    const ics = stringifyCalendar(wrapInCalendar(event));

    const client = deps.storage;
    await client.create(calendarName, uid, ics);

    // Separate VEVENTs, not folded into the main event, so they stay
    // independently visible/movable and independently cleanable by
    // schedule_delete.
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
      await client.create(
        calendarName,
        bufUid,
        stringifyCalendar(wrapInCalendar(bufEvent)),
      );
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
      await client.create(
        calendarName,
        bufUid,
        stringifyCalendar(wrapInCalendar(bufEvent)),
      );
      bufferKinds.push("after");
    }

    const suffix = bufferKinds.length
      ? ` (with ${bufferKinds.join(" and ")} travel buffer${bufferKinds.length > 1 ? "s" : ""})`
      : "";
    return ok(
      `Created event "${title}" (id: ${uid}) in ${calendarName}${suffix}.`,
    );
  } catch (e) {
    return err(e);
  }
}
