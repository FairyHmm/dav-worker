import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { ListSchema, EventIdSchema, DueFilterSchema, StatusSchema, SortSchema } from "../utils/schemas.js";
import { extractTaskSummaries } from "../utils/mapping.js";
import type { TaskSummary } from "../utils/mapping.js";
import { resolveTimeWindow } from "../utils/time.js";
import { basicToIso } from "@dav-worker/calendar-ical";

export function registerTaskListTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "task_list",
    {
      description:
        "List tasks. Omit `list` to search every task list. Pass `event_id` to " +
        "filter to tasks linked to that event, `due` to filter by due date, " +
        "`status` to filter by state, and `sort` to order the results.",
      inputSchema: {
        list: ListSchema.optional(),
        event_id: EventIdSchema,
        due: DueFilterSchema,
        status: StatusSchema,
        sort: SortSchema,
      },
    },
    async ({ list, event_id, due, status, sort }) => {
      try {
        const listNames = list ? [list] : (await deps.storage.listAll()).map((l) => l.slug);

        const window = due ? resolveTimeWindow(due) : undefined;
        const windowIso = window
          ? { startIso: basicToIso(window.startUtc), endIso: basicToIso(window.endUtc) }
          : undefined;

        const results: Array<TaskSummary & { list: string }> = [];

        for (const listName of listNames) {
          const entries = await deps.storage.list(listName);
          for (const entry of entries) {
            for (const summary of extractTaskSummaries(entry.ics)) {
              if (event_id && summary.eventId !== event_id) continue;
              if (status && summary.status !== status) continue;
              if (windowIso) {
                if (!summary.due) continue;
                if (summary.due < windowIso.startIso || summary.due >= windowIso.endIso) continue;
              }
              results.push({ ...summary, list: listName });
            }
          }
        }

        if (sort === "due") {
          results.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
        } else if (sort === "completion") {
          results.sort((a, b) => (a.percentComplete ?? 0) - (b.percentComplete ?? 0));
        }

        if (results.length === 0) return ok("No tasks found.");

        const lines = results.map((t) => {
          const duePart = t.due ? `due: ${t.due}, ` : "";
          const statusPart = t.status ? `${t.status}, ` : "";
          const linkPart = t.eventId ? `, linked to: ${t.eventId}` : "";
          return `${t.title}  [${t.list}]  (${statusPart}${duePart}id: ${t.uid}${linkPart})`;
        });
        return ok(lines.join("\n"));
      } catch (e) {
        return err(e);
      }
    },
  );
}
