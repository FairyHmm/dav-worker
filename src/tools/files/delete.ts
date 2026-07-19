import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav/index.js";
import { ok, err } from "../../utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";
import { resolveLocation } from "../../locations/index.js";

export function registerDeleteTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_files_delete",
    {
      description:
        "Delete a file or folder from the Nextcloud vault. No-ops silently if " +
        "the path does not exist. Pass `location` instead of `path` to use a " +
        "named location shortcut.",
      inputSchema: { path: PathSchema.optional(), location: LocationSchema },
    },
    async ({ path: pathArg, location }) => {
      try {
        const path = location ? resolveLocation(location) : (pathArg ?? "");
        const client = new WebDAVClient(env);
        await client.delete(path);
        return ok(`Deleted: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
