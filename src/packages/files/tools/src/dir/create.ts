import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils/index.js";
import { PathSchema, LocationSchema } from "../schemas.js";

export function registerCreateFolderTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "dir_create",
    {
      description:
        "Create a directory. Succeeds silently if it already exists. " +
        "`location` can name a shortcut base, with `path` as a relative " +
        "addition onto it.",
      inputSchema: { path: PathSchema.optional(), location: LocationSchema },
    },
    async ({ path: pathArg, location }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
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
