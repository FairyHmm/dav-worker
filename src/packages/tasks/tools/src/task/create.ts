import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { TaskTitleSchema, ListSchema, EventIdSchema } from "../utils/schemas.js";
import { buildTaskComponent, linkTaskToEvent } from "../utils/mapping.js";
import { wrapInCalendar, stringifyCalendar } from "@dav-worker/calendar-ical";

export function registerTaskCreateTool(server: McpServer, deps: TaskToolsDeps): void {
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
        title: TaskTitleSchema,
        list: ListSchema,
        event_id: EventIdSchema,
      },
    },
    async ({ title, list, event_id }) => {
      // An empty list slug resolves to the calendars home collection
      // itself (davPath(basePath, "") === basePath), not a 404 — same
      // guard as list_create/list_delete.
      if (list === "") {
        return err(new Error("A task list slug is required."));
      }
      try {
        const uid = crypto.randomUUID();
        const todo = buildTaskComponent(uid, { title });

        if (event_id) {
          const failure = await linkTaskToEvent(todo, event_id, deps.resolveEventDue, "created");
          if (failure) return err(new Error(failure));
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
