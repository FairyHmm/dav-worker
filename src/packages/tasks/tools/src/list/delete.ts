import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { ok, err } from "../utils";
import { ListTargetSchema } from "../utils/schemas";
import {
  withBatchSupport,
  runBatchTool,
  required,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape() {
  return {
    // required() rejects "" too, covering the same empty-slug guard
    // list_create needs — no separate `if (list === "")` required here.
    list: required(ListTargetSchema),
  };
}

type DeleteItem = Resolved<ReturnType<typeof createItemShape>, "list">;

export function registerListDeleteTool(
  server: McpServer,
  deps: TaskToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
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
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: DeleteItem) =>
        deleteListItem(deps, item),
      ),
  );
}

async function deleteListItem(deps: TaskToolsDeps, item: DeleteItem) {
  const { list } = item;
  try {
    // This DELETE succeeds against Nextcloud's calendar trashbin
    // (default 30-day retention, `calendarRetentionObligation`),
    // which soft-deletes rather than removing the collection
    // outright — confirmed empirically: list_create against the
    // same slug right after this still 405s as "already exists."
    // There's no documented WebDAV call this function can make to
    // force a permanent purge (unlike the files trashbin,
    // calendars have no public restore/purge DAV endpoint) —
    // that's server-side (`occ`) or Nextcloud Calendar-app-UI only.
    await deps.storage.listDelete(list);
    return ok(`Deleted task list "${list}".`);
  } catch (e) {
    return err(e);
  }
}
