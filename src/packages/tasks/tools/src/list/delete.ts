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
        "No-op, not an error, if the slug doesn't exist.",
      inputSchema: { list: ListSchema },
    },
    async ({ list }) => {
      try {
        await deps.storage.listDelete(list);
        return ok(`Deleted task list "${list}".`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
