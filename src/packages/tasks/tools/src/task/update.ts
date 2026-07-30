import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { TaskIdSchema, TaskTitleSchema, ListSchema, EventIdSchema } from "../utils/schemas.js";
import { z } from "zod";
import { findTaskAcrossLists, formatWarnings } from "../utils/find.js";
import { applyTaskFields, setTaskDue, setTaskRelatedTo } from "../utils/mapping.js";
import { parseCalendar, findComponent, wrapInCalendar, stringifyCalendar } from "@dav-worker/calendar-ical";

const StatusSchema = z
  .enum(["progress", "completed", "cancelled"])
  .optional()
  .describe("New task status. Omit to leave the current status unchanged.");

export function registerTaskUpdateTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "task_update",
    {
      description:
        "Update a task by id, changing only the fields provided. Passing " +
        "`event_id` links or re-links the task to an event, updating its " +
        "due date to match. Omitting `event_id` leaves any existing due " +
        "date and link unchanged. Passing `list` moves the task to a " +
        "different list.",
      inputSchema: {
        id: TaskIdSchema,
        title: TaskTitleSchema.optional(),
        status: StatusSchema,
        event_id: EventIdSchema,
        list: ListSchema.optional(),
      },
    },
    async ({ id, title, status, event_id, list }) => {
      try {
        const { found, warnings } = await findTaskAcrossLists(deps.storage, id);
        if (!found) {
          return err(new Error(`${formatWarnings(warnings)}No task found with id: ${id}`));
        }
        const { list: currentList, entry } = found;
        if (!entry.ics) {
          return err(new Error(`Task ${id} has no calendar-data to update.`));
        }

        const cal = parseCalendar(entry.ics);
        const todo = findComponent(cal, "VTODO");
        if (!todo) {
          return err(new Error(`Task ${id}'s iCalendar data has no VTODO.`));
        }

        applyTaskFields(todo, { title, status });

        if (event_id) {
          const due = await deps.resolveEventDue(event_id);
          if (due === null) {
            return err(new Error(`Event "${event_id}" not found — task not updated.`));
          }
          setTaskDue(todo, due);
          setTaskRelatedTo(todo, event_id);
        }

        const ics = stringifyCalendar(wrapInCalendar(todo));
        const targetList = list ?? currentList;

        if (targetList !== currentList) {
          await deps.storage.create(targetList, id, ics);
          await deps.storage.delete(currentList, id);
          return ok(
            `${formatWarnings(warnings)}Updated task (id: ${id}) and moved it from ` +
              `${currentList} to ${targetList}.`,
          );
        }

        await deps.storage.update(currentList, id, ics);
        return ok(`${formatWarnings(warnings)}Updated task (id: ${id}) in ${currentList}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
