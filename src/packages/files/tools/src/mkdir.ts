import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./deps.js";
import { ok, err } from "./utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";
import { resolveLocation } from "@dav-worker/files-locations";

export function registerCreateFolderTool(server: McpServer, deps: FileToolsDeps): void {
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
        const path = location ? resolveLocation(deps.config, location) : (pathArg ?? "");
        const client = deps.storage;
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
