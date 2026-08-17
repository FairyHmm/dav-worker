import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { slugify } from "../utils/slugify";
import {
  ListSchema,
  EventIdSchema,
  DueFilterSchema,
  StatusSchema,
  SortSchema,
  TagsFilterSchema,
} from "../utils/schemas";
import { extractTaskSummaries } from "../utils/mapping";
import type { TaskSummary } from "../utils/mapping";
import { resolveTimeWindow } from "@dav-worker/time-utils";
import { basicToIso } from "@dav-worker/calendar-ical";
import type { Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

// All filters are optional — nothing here is required() the way
// list_create's `name` is, since an empty item (list_all's own tasks-
// wide query) is a legitimate call, not a mistake.
function createItemShape() {
  return {
    list: ListSchema.optional(),
    event_id: EventIdSchema,
    due: DueFilterSchema,
    status: StatusSchema,
    tags: TagsFilterSchema,
    sort: SortSchema,
  };
}

type ListItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerTaskListTool(
  server: McpServer,
  deps: TaskToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "tasks",
    disabled,
    "task_list",
    {
      description: "List tasks, optionally filtered and sorted.",
      annotations: {
        title: "List Tasks",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: ListItem) => listTaskItem(deps, item),
    undefined,
    collector,
  );
}

async function listTaskItem(deps: TaskToolsDeps, item: ListItem) {
  const { list, event_id, due, status, tags, sort } = item;
  try {
    // listAll()'s slugs are already storage-real; a caller-given list
    // isn't, so only that branch needs slugify().
    const listNames = list
      ? [slugify(list)]
      : (await deps.storage.listAll()).map((l) => l.slug);

    const window = due ? resolveTimeWindow(due) : undefined;
    const windowIso = window
      ? {
          startIso: basicToIso(window.startUtc),
          endIso: basicToIso(window.endUtc),
        }
      : undefined;

    const results: Array<TaskSummary & { list: string }> = [];

    for (const listName of listNames) {
      const entries = await deps.storage.list(listName);
      for (const entry of entries) {
        for (const summary of extractTaskSummaries(entry.ics)) {
          if (event_id && summary.eventId !== event_id) continue;
          if (status && summary.status !== status) continue;
          // Split into required (plain, OR) and excluded ('-'
          // prefix, AND) per TagsFilterSchema's symmetry with
          // TagsSchema's write-side convention.
          if (tags && tags.length > 0) {
            const taskTags = summary.tags ?? [];
            const excluded = tags
              .filter((t) => t.startsWith("-"))
              .map((t) => t.slice(1));
            const required = tags.filter((t) => !t.startsWith("-"));
            if (excluded.some((t) => taskTags.includes(t))) continue;
            if (
              required.length > 0 &&
              !required.some((t) => taskTags.includes(t))
            )
              continue;
          }
          if (windowIso) {
            if (!summary.due) continue;
            if (
              summary.due < windowIso.startIso ||
              summary.due >= windowIso.endIso
            )
              continue;
          }
          results.push({ ...summary, list: listName });
        }
      }
    }

    if (sort === "due") {
      results.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
    } else if (sort === "completion") {
      results.sort(
        (a, b) => (a.percentComplete ?? 0) - (b.percentComplete ?? 0),
      );
    }

    if (results.length === 0) return ok("No tasks found.");

    const lines = results.map((t) => {
      const duePart = t.due ? `due: ${t.due}, ` : "";
      const statusPart = t.status ? `${t.status}, ` : "";
      const tagsPart =
        t.tags && t.tags.length > 0 ? `tags: ${t.tags.join(", ")}, ` : "";
      const linkPart = t.eventId ? `, linked to: ${t.eventId}` : "";
      return `${t.title}  [${t.list}]  (${statusPart}${tagsPart}${duePart}id: ${t.uid}${linkPart})`;
    });
    return ok(lines.join("\n"));
  } catch (e) {
    return err(e);
  }
}
