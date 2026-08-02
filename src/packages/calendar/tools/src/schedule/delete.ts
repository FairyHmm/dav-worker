import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { CalendarToolsDeps } from "../deps";
import { ok, err } from "../utils";
import { IdSchema, OccurrenceSchema } from "../utils/schemas";
import { findEventAcrossCalendars, formatWarnings } from "../utils/find";
import { findMasterEvent, findOccurrenceOverride } from "../utils/mapping";
import {
  parseCalendar,
  findAllComponents,
  addExdate,
  stringifyCalendar,
} from "@dav-worker/calendar-ical";
import {
  withBatchSupport,
  runBatchTool,
  required,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape() {
  return {
    id: required(IdSchema),
    occurrence: OccurrenceSchema,
  };
}

type DeleteItem = Resolved<ReturnType<typeof createItemShape>, "id">;

export function registerScheduleDeleteTool(
  server: McpServer,
  deps: CalendarToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
    "schedule_delete",
    {
      description:
        "Delete a calendar event by id, along with any linked travel-buffer " +
        "events. No-op if the id doesn't exist.",
      annotations: {
        title: "Delete Event",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: DeleteItem) =>
        deleteEventItem(deps, item),
      ),
  );
}

async function deleteEventItem(deps: CalendarToolsDeps, item: DeleteItem) {
  const { id, occurrence } = item;
  try {
    const client = deps.storage;

    // Buffer cleanup needs to know which one calendar to search, so
    // locate it up front rather than trying delete() everywhere.
    const { found, warnings } = await findEventAcrossCalendars(
      client,
      deps.config,
      "VEVENT",
      id,
    );
    if (!found) {
      // A skipped calendar could be hiding a real event, so a clean
      // "if it existed" no-op still surfaces any warnings.
      return ok(
        `${formatWarnings(warnings)}Deleted event (id: ${id}), if it existed.`,
      );
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
          new Error(
            `Event ${id} has no recurring master; cannot skip occurrence ${occurrence}.`,
          ),
        );
      }
      addExdate(master, occurrence);

      // EXDATE only stops the master's RRULE from regenerating this
      // occurrence — a previously-edited occurrence exists as its own
      // override component and stays visible regardless, so it must be
      // removed explicitly too.
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
    return ok(
      `${formatWarnings(warnings)}Deleted event (id: ${id})${bufferNote}.`,
    );
  } catch (e) {
    return err(e);
  }
}
