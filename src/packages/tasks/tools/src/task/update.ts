import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { ok, err } from "@dav-worker/mcp-utils";
import { slugify } from "../utils/slugify";
import {
  TaskIdSchema,
  TaskTitleSchema,
  ListSchema,
  UpdateEventIdSchema,
  UpdateProgressSchema,
  PrioritySchema,
  TagsSchema,
  UrlSchema,
} from "../utils/schemas";
import { findTaskAcrossLists, formatWarnings } from "../utils/find";
import {
  applyTaskFields,
  linkTaskToEvent,
  unlinkTaskFromEvent,
} from "../utils/mapping";
import {
  parseCalendar,
  findComponent,
  stringifyCalendar,
} from "@dav-worker/calendar-ical";
import {
  withBatchSupport,
  runBatchTool,
  required,
  locked,
  type Resolved,
} from "@dav-worker/batch-core";

// See SPEC-BATCH.md for required()/locked() semantics.
function createItemShape() {
  return {
    id: required(TaskIdSchema),
    title: TaskTitleSchema.optional(),
    progress: UpdateProgressSchema,
    priority: PrioritySchema,
    tags: TagsSchema,
    url: UrlSchema,
    event_id: UpdateEventIdSchema,
    list: locked(ListSchema.optional()),
  };
}

type UpdateItem = Resolved<ReturnType<typeof createItemShape>, "id">;

export function registerTaskUpdateTool(
  server: McpServer,
  deps: TaskToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
    "task_update",
    {
      description: "Update a task by id, changing only the fields provided.",
      annotations: {
        title: "Update Task",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: UpdateItem) =>
        updateTaskItem(deps, item),
      ),
  );
}

async function updateTaskItem(deps: TaskToolsDeps, item: UpdateItem) {
  const { id, event_id } = item;
  // Slugify before the "" check below, so a name that slugifies to ""
  // (e.g. "!!!") still trips it.
  const list = item.list !== undefined ? slugify(item.list) : undefined;
  // "" resolves to the base collection, not a 404 — must reject explicitly.
  if (list === "") {
    return err(new Error("A task list slug is required to move a task."));
  }
  try {
    const { found, warnings } = await findTaskAcrossLists(deps.storage, id);
    if (!found) {
      return err(
        new Error(`${formatWarnings(warnings)}No task found with id: ${id}`),
      );
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

    // applyTaskFields reads only the fields it cares about from item; no
    // field list to keep in sync here.
    applyTaskFields(todo, item);

    if (event_id === "unlink") {
      unlinkTaskFromEvent(todo);
    } else if (event_id) {
      const failure = await linkTaskToEvent(
        todo,
        event_id,
        deps.resolveEventDue,
        "updated",
      );
      if (failure) return err(new Error(failure));
    }

    // Re-stringify the whole cal, not just `todo` — a resource can hold
    // more than one component.
    const ics = stringifyCalendar(cal);
    const targetList = list ?? currentList;

    if (targetList !== currentList) {
      // No CalDAV MOVE — create-then-delete, in that order, so a failure
      // duplicates rather than loses the task.
      await deps.storage.create(targetList, id, ics);
      try {
        await deps.storage.delete(currentList, id);
      } catch (deleteError) {
        const reason =
          deleteError instanceof Error
            ? deleteError.message
            : String(deleteError);
        return err(
          new Error(
            `${formatWarnings(warnings)}Task (id: ${id}) was created in ${targetList} but ` +
              `could not be removed from ${currentList} (${reason}). It now exists in ` +
              `both lists — delete it from ${currentList} manually to finish the move.`,
          ),
        );
      }
      return ok(
        `${formatWarnings(warnings)}Updated task (id: ${id}) and moved it from ` +
          `${currentList} to ${targetList}.`,
      );
    }

    await deps.storage.update(currentList, id, ics);
    return ok(
      `${formatWarnings(warnings)}Updated task (id: ${id}) in ${currentList}.`,
    );
  } catch (e) {
    return err(e);
  }
}
