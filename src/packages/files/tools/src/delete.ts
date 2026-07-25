import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./deps.js";
import { ok, err } from "./utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";
import { resolveLocation } from "@dav-worker/files-locations";

export function registerDeleteTool(server: McpServer, deps: FileToolsDeps): void {
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
        const path = location ? resolveLocation(deps.config, location) : (pathArg ?? "");
        const client = deps.storage;
        await client.delete(path);
        return ok(`Deleted: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
