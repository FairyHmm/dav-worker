import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema } from "./schemas.js";

export function registerCreateFolderTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_mkdir",
    "Create a folder in the Nextcloud vault. Succeeds silently if the folder already exists.",
    { path: PathSchema },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        const { alreadyExists } = await client.mkdir(path);
        return ok(alreadyExists ? `Already exists: ${path}` : `Created: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
