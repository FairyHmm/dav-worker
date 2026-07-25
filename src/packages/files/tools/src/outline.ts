import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./deps.js";
import { outline } from "@dav-worker/files-parser";
import { ok, err, resolvePath } from "./utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";

export function registerOutlineTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "nc_files_outline",
    {
      description:
        "Return the heading structure of a Markdown file as a nested tree " +
        "(level, title, children) without body content. Useful for orienting " +
        "in a large note before a targeted block read/write. Pass `location` " +
        "instead of `path` to use a named location shortcut.",
      inputSchema: { path: PathSchema.optional(), location: LocationSchema },
    },
    async ({ path: pathArg, location }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        const { content } = await client.read(path);
        const tree = outline(content);
        return ok(JSON.stringify(tree, null, 2));
      } catch (e) {
        return err(e);
      }
    },
  );
}
