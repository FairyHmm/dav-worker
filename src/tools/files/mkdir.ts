import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";
import { resolveLocation } from "../../locations/index.js";

export function registerCreateFolderTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_files_mkdir",
    {
      description:
        "Create a folder in the Nextcloud vault. Succeeds silently if the folder " +
        "already exists. Pass `location` instead of `path` to use a named " +
        "location shortcut.",
      inputSchema: { path: PathSchema.optional(), location: LocationSchema },
    },
    async ({ path: pathArg, location }) => {
      try {
        const path = location ? resolveLocation(location) : (pathArg ?? "");
        const client = new WebDAVClient(env);
        const { alreadyExists } = await client.mkdir(path);
        return ok(
          alreadyExists ? `Already exists: ${path}` : `Created: ${path}`,
        );
      } catch (e) {
        return err(e);
      }
    },
  );
}
