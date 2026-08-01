import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import {
  TaskTitleSchema,
  ListSchema,
  EventIdSchema,
} from "../utils/schemas.js";
import { buildTaskComponent, linkTaskToEvent } from "../utils/mapping.js";
import { wrapInCalendar, stringifyCalendar } from "@dav-worker/calendar-ical";
import {
  withBatchSupport,
  runBatchTool,
  required,
  locked,
  type Resolved,
} from "@dav-worker/batch-core";

// Item shape, individually optional so an item can omit a field and
// inherit the matching top-level value (SPEC-BATCH.md: whole-value
// replace, no merging). Reused for both the top-level params and each
// entry in `items`.
//
// title/list are also tagged required() — .optional() only permits an
// item to omit the field and inherit it, it doesn't mean the field can
// stay empty after resolution; required() is what runBatchTool checks
// post-fill, replacing hand-written `if (!title)`/`if (!list)` guards
// (one is easy to forget per new field; this can't be).
//
// list is additionally locked(): the field determines *where* each
// task is physically written, so silently letting individual batch
// items target different lists is a footgun a caller is unlikely to
// have intended without saying so explicitly. A batch either shares one
// target list (top-level default) or the caller makes separate calls.
const itemShape = {
  title: required(TaskTitleSchema.optional()),
  list: locked(required(ListSchema.optional())),
  event_id: EventIdSchema,
};

export function registerTaskCreateTool(
  server: McpServer,
  deps: TaskToolsDeps,
): void {
  server.registerTool(
    "task_create",
    {
      description:
        "Create a task in a task list. Optionally link it to an event via " +
        "`event_id`, which gives the task a due date matching the event's " +
        "start.",
      annotations: {
        title: "Create Task",
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
      runBatchTool(
        params,
        itemShape,
        err,
        async ({
          title,
          list,
          event_id,
        }: Resolved<typeof itemShape, "title" | "list">) => {
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
            return ok(
              `Created task "${title}" (id: ${uid}) in ${list}${suffix}.`,
            );
          } catch (e) {
            return err(e);
          }
        },
      ),
  );
}
