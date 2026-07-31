import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { ListSchema } from "../utils/schemas.js";

export function registerListDeleteTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "list_delete",
    {
      description:
        "Delete a task list (the CalDAV collection and every task in it). " +
        "No-op, not an error, if the slug doesn't exist. The name may be " +
        "temporarily unavailable for reuse afterward.",
      annotations: {
        title: "Delete Task List",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: { list: ListSchema },
    },
    async ({ list }) => {
      // Same reasoning as list_create: an empty slug resolves to the
      // calendars home collection itself (davPath(basePath, "") ===
      // basePath), not a 404 — reject it here rather than letting it
      // reach storage.listDelete.
      if (list === "") {
        return err(new Error("A task list slug is required."));
      }
      try {
        // This DELETE succeeds against Nextcloud's calendar trashbin
        // (default 30-day retention, `calendarRetentionObligation`),
        // which soft-deletes rather than removing the collection outright
        // — confirmed empirically: list_create against the same slug
        // right after this still 405s as "already exists." There's no
        // documented WebDAV call this function can make to force a
        // permanent purge (unlike the files trashbin, calendars have no
        // public restore/purge DAV endpoint) — that's server-side
        // (`occ`) or Nextcloud Calendar-app-UI only.
        await deps.storage.listDelete(list);
        return ok(`Deleted task list "${list}".`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
