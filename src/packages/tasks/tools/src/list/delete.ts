import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { ListTargetSchema } from "../utils/schemas.js";
import { withBatchSupport, runBatchTool, required, type Resolved } from "@dav-worker/batch-core";

// list is the only field, required() — resolveItems' required() check
// already rejects both `undefined` and `""`, which covers the same
// empty-slug guard (davPath(basePath, "") resolves to the calendars home
// collection itself, not a 404) list_create also needs, so the
// hand-written `if (list === "")` this tool used to carry is redundant
// now and has been dropped.
const itemShape = {
  list: required(ListTargetSchema),
};

export function registerListDeleteTool(server: McpServer, deps: TaskToolsDeps): void {
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
      runBatchTool(params, itemShape, err, async ({ list }: Resolved<typeof itemShape, "list">) => {
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
      }),
  );
}
