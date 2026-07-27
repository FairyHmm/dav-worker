import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils.js";
import { PathSchema, LocationSchema } from "../schemas.js";

export function registerStatTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "entry_stat",
    {
      description:
        "Get metadata for a file or directory (size, type, last modified). " +
        "`location` can name a shortcut base, with `path` as a relative " +
        "addition onto it.",
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
