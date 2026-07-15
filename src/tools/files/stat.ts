import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema } from "./schemas.js";

export function registerStatTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_stat",
    "Get metadata for a single file or folder in the Nextcloud vault (size, type, last modified).",
    { path: PathSchema },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        const meta = await client.stat(path);
        return ok(JSON.stringify(meta, null, 2));
      } catch (e) {
        return err(e);
      }
    },
  );
}
