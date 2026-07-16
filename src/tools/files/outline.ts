import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { outline } from "../../parser/outline.js";
import { ok, err } from "../../utils.js";
import { PathSchema } from "./schemas.js";

export function registerOutlineTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_outline",
    "Return the heading structure of a Markdown file as a nested tree " +
      "(level, title, children) without body content. Useful for orienting " +
      "in a large note before a targeted block read/write.",
    { path: PathSchema },
    async ({ path }) => {
      try {
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
