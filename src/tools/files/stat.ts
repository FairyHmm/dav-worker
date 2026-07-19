import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";
import { resolveLocation } from "../../locations/index.js";

export function registerStatTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_files_stat",
    {
      description:
        "Get metadata for a single file or folder in the Nextcloud vault (size, " +
        "type, last modified). Pass `location` instead of `path` to use a " +
        "named location shortcut.",
      inputSchema: { path: PathSchema.optional(), location: LocationSchema },
    },
    async ({ path: pathArg, location }) => {
      try {
        const path = location ? resolveLocation(location) : (pathArg ?? "");
        const client = new WebDAVClient(env);
        const meta = await client.stat(path);
        return ok(JSON.stringify(meta, null, 2));
      } catch (e) {
        return err(e);
      }
    },
  );
}
