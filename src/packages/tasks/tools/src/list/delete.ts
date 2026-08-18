import type { McpServer } from "@modelcontextprotocol/server";
import type { TaskToolsDeps } from "../deps";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { slugify } from "../utils/slugify";
import { ListTargetSchema } from "../utils/schemas";
import { required, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    list: required(ListTargetSchema),
  };
}

type DeleteItem = Resolved<ReturnType<typeof createItemShape>, "list">;

export function registerListDeleteTool(
  server: McpServer,
  deps: TaskToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "tasks",
    disabled,
    "list_delete",
    {
      description:
        "Delete a task list and every task in it. No-op, not an error, if the " +
        "slug doesn't exist. The list goes to the trashbin rather than being " +
        "removed outright, so the same slug can't be reused right away.",
      annotations: {
        title: "Delete Task List",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: DeleteItem) => deleteListItem(deps, item),
    undefined,
    collector,
  );
}

async function deleteListItem(deps: TaskToolsDeps, item: DeleteItem) {
  const list = slugify(item.list);
  // "" resolves to the base collection, not a 404 — must reject explicitly.
  if (list === "") {
    return err(new Error("A task list slug is required to delete a list."));
  }
  try {
    // No public restore/purge DAV endpoint for calendars (unlike files'
    // trashbin) — permanent purge is server-side (`occ`) or UI-only.
    await deps.storage.listDelete(list);
    return ok(`Deleted task list "${list}".`);
  } catch (e) {
    return err(e);
  }
}
