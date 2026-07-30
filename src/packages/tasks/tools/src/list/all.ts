import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";

export function registerListAllTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "list_all",
    {
      description:
        "List all existing task lists.",
      inputSchema: {},
    },
    async () => {
      try {
        const lists = await deps.storage.listAll();
        if (lists.length === 0) return ok("No task lists found.");
        const lines = lists.map((l) => `${l.displayName}  (slug: ${l.slug})`);
        return ok(lines.join("\n"));
      } catch (e) {
        return err(e);
      }
    },
  );
}
