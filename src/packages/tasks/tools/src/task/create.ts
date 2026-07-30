import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { TaskTitleSchema, ListSchema, EventIdSchema } from "../utils/schemas.js";
import { buildTaskComponent, setTaskDue, setTaskRelatedTo } from "../utils/mapping.js";
import { wrapInCalendar, stringifyCalendar } from "@dav-worker/calendar-ical";

export function registerTaskCreateTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "task_create",
    {
      description:
        "Create a task in a task list. Optionally pass `event_id` to link it to " +
        "an event — its start is copied in as this task's due date (one-shot, " +
        "not live-synced) and a RELATED-TO is written. There is no direct `due` " +
        "input: a task's date only ever comes from a linked event. Genuinely " +
        "undated, unlinked tasks belong in Markdown files, not here.",
      inputSchema: {
        title: TaskTitleSchema,
        list: ListSchema,
        event_id: EventIdSchema,
      },
    },
    async ({ title, list, event_id }) => {
      try {
        const uid = crypto.randomUUID();
        const todo = buildTaskComponent(uid, { title });

        if (event_id) {
          const due = await deps.resolveEventDue(event_id);
          // Fail closed: an explicit event link that can't be resolved is
          // surprising to silently downgrade into a standalone task. The
          // caller can retry without event_id if that's actually what
          // they want (SPEC-TASKS.md).
          if (due === null) {
            return err(new Error(`Event "${event_id}" not found — no task created.`));
          }
          setTaskDue(todo, due);
          setTaskRelatedTo(todo, event_id);
        }

        const ics = stringifyCalendar(wrapInCalendar(todo));
        await deps.storage.create(list, uid, ics);

        const suffix = event_id ? ` (linked to event ${event_id})` : "";
        return ok(`Created task "${title}" (id: ${uid}) in ${list}${suffix}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
