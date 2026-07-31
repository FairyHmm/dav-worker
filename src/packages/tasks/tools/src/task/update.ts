import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import {
  TaskIdSchema,
  TaskTitleSchema,
  ListSchema,
  UpdateEventIdSchema,
  UpdateProgressSchema,
  PrioritySchema,
  TagsSchema,
  UrlSchema,
} from "../utils/schemas.js";
import { findTaskAcrossLists, formatWarnings } from "../utils/find.js";
import { applyTaskFields, linkTaskToEvent, unlinkTaskFromEvent } from "../utils/mapping.js";
import { parseCalendar, findComponent, stringifyCalendar } from "@dav-worker/calendar-ical";

export function registerTaskUpdateTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "task_update",
    {
      description:
        "Update a task by id, changing only the fields provided: title, " +
        "progress or cancellation, priority, tags, URL, event link, or " +
        "list.",
      annotations: {
        title: "Update Task",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        id: TaskIdSchema,
        title: TaskTitleSchema.optional(),
        progress: UpdateProgressSchema,
        priority: PrioritySchema,
        tags: TagsSchema,
        url: UrlSchema,
        event_id: UpdateEventIdSchema,
        list: ListSchema.optional(),
      },
    },
    async ({ id, title, progress, priority, tags, url, event_id, list }) => {
      // An empty list slug resolves to the calendars home collection
      // itself (davPath(basePath, "") === basePath), not a 404 — same
      // guard as list_create/list_delete/task_create. `list` is optional
      // here (undefined = "don't move"), so only reject an explicit "".
      if (list === "") {
        return err(new Error("A task list slug is required to move a task."));
      }
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

        applyTaskFields(todo, { title, progress, priority, tags, url });

        if (event_id === "unlink") {
          unlinkTaskFromEvent(todo);
        } else if (event_id) {
          const failure = await linkTaskToEvent(todo, event_id, deps.resolveEventDue, "updated");
          if (failure) return err(new Error(failure));
        }

        // Stringify the whole parsed calendar (todo is a live reference
        // into cal.components, mutated in place above), not a fresh
        // single-component wrapper — a resource can in principle hold
        // more than one VTODO (mapping.ts' extractTaskSummaries handles
        // this), and re-wrapping just `todo` would silently drop every
        // other component in the resource on write. Mirrors how
        // schedule_update re-stringifies the full `cal` it parsed rather
        // than a single extracted component.
        const ics = stringifyCalendar(cal);
        const targetList = list ?? currentList;

        if (targetList !== currentList) {
          // No cross-collection MOVE in CalDAV (SPEC-TASKS.md) — this is
          // create-at-new-location then delete-at-old, in that order
          // specifically so a failure leaves the task duplicated rather
          // than lost. But if create succeeds and delete then throws, the
          // task now silently exists under the same UID in *both* lists —
          // the caller would otherwise just see a generic error with no
          // indication that a duplicate now needs manual cleanup, and
          // findTaskAcrossLists would return whichever list it iterates
          // to first on a later lookup. Surface the duplication
          // explicitly instead of letting it fall through to the generic
          // catch below.
          await deps.storage.create(targetList, id, ics);
          try {
            await deps.storage.delete(currentList, id);
          } catch (deleteError) {
            const reason =
              deleteError instanceof Error ? deleteError.message : String(deleteError);
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
        return ok(`${formatWarnings(warnings)}Updated task (id: ${id}) in ${currentList}.`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
