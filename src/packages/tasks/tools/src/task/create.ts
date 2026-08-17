import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { slugify } from "../utils/slugify";
import { TaskTitleSchema, ListSchema, EventIdSchema } from "../utils/schemas";
import { buildTaskComponent, linkTaskToEvent } from "../utils/mapping";
import { wrapInCalendar, stringifyCalendar } from "@dav-worker/calendar-ical";
import { required, locked, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    title: required(TaskTitleSchema.optional()),
    // locked(): `list` picks where each task is physically written,
    // so batch items silently targeting different lists is a
    // footgun — a batch shares one target list, or the caller makes
    // separate calls.
    list: locked(required(ListSchema.optional())),
    event_id: EventIdSchema,
  };
}

type CreateItem = Resolved<
  ReturnType<typeof createItemShape>,
  "title" | "list"
>;

export function registerTaskCreateTool(
  server: McpServer,
  deps: TaskToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "tasks",
    disabled,
    "task_create",
    {
      description: "Create a task in a task list.",
      annotations: {
        title: "Create Task",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: CreateItem) => createTaskItem(deps, item),
    undefined,
    collector,
  );
}

async function createTaskItem(deps: TaskToolsDeps, item: CreateItem) {
  const { title, event_id } = item;
  // Un-slugified input would otherwise 404 against storage.
  const list = slugify(item.list);
  try {
    const uid = crypto.randomUUID();
    const todo = buildTaskComponent(uid, { title });

    if (event_id) {
      const failure = await linkTaskToEvent(
        todo,
        event_id,
        deps.resolveEventDue,
        "created",
      );
      if (failure) return err(new Error(failure));
    }

    const ics = stringifyCalendar(wrapInCalendar(todo));
    await deps.storage.create(list, uid, ics);

    const suffix = event_id ? ` (linked to event ${event_id})` : "";
    return ok(`Created task "${title}" (id: ${uid}) in ${list}${suffix}.`);
  } catch (e) {
    return err(e);
  }
}
