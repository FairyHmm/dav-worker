import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema } from "./schemas.js";

export function registerReadTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_read",
    "Read a text file from the Nextcloud vault. Returns an error for binary files.",
    { path: PathSchema },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        const { content } = await client.read(path);
        return ok(content);
      } catch (e) {
        return err(e);
      }
    },
  );
}
