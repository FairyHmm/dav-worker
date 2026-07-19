import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav/index.js";
import { outline } from "../../parser/markdown/index.js";
import { ok, err } from "../../utils.js";
import { PathSchema, LocationSchema } from "./schemas.js";
import { resolveLocation } from "../../locations/index.js";

export function registerOutlineTool(server: McpServer, env: Env): void {
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
        const path = location ? resolveLocation(location) : (pathArg ?? "");
        const client = new WebDAVClient(env);
        const { content } = await client.read(path);
        const tree = outline(content);
        return ok(JSON.stringify(tree, null, 2));
      } catch (e) {
        return err(e);
      }
    },
  );
}
