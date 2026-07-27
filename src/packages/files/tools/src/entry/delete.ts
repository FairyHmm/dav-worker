import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils.js";
import { PathSchema, LocationSchema } from "../schemas.js";

export function registerDeleteTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "entry_delete",
    {
      description:
        "Delete a file or directory. No-ops silently if it doesn't exist. " +
        "`location` can name a shortcut base, with `path` as a relative " +
        "addition onto it.",
      inputSchema: { path: PathSchema.optional(), location: LocationSchema },
    },
    async ({ path: pathArg, location }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        await client.delete(path);
        return ok(`Deleted: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
