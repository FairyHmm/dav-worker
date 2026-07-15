import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema } from "./schemas.js";

export function registerDeleteTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_delete",
    "Delete a file or folder from the Nextcloud vault. No-ops silently if the path does not exist.",
    { path: PathSchema },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        await client.delete(path);
        return ok(`Deleted: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
