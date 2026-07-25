import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./deps.js";
import { ok, err, resolvePath } from "./utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";

export function registerStatTool(server: McpServer, deps: FileToolsDeps): void {
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
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        const meta = await client.stat(path);
        return ok(JSON.stringify(meta, null, 2));
      } catch (e) {
        return err(e);
      }
    },
  );
}
