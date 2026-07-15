import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema } from "./schemas.js";

export function registerWriteTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_write",
    "Write text content to a file in the Nextcloud vault. Creates the file if it does not exist; overwrites if it does.",
    {
      path: PathSchema,
      content: z.string().describe("Text content to write"),
    },
    async ({ path, content }) => {
      try {
        const client = new WebDAVClient(env);
        const { created } = await client.write(path, content);
        return ok(created ? `Created: ${path}` : `Updated: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
