import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { readBlock } from "../../parser/block-read.js";
import { ok, err } from "../../utils.js";
import { BlockSchema, PathSchema } from "./schemas.js";

export function registerReadTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_read",
    "Read a text file from the Nextcloud vault. Returns an error for binary files. " +
      "Pass `block` with a heading title to read only that heading's section " +
      "(including its nested subheadings) instead of the whole file.",
    { path: PathSchema, block: BlockSchema },
    async ({ path, block }) => {
      try {
        const client = new WebDAVClient(env);
        const { content } = await client.read(path);

        if (block === undefined) {
          return ok(content);
        }

        const blockContent = readBlock(content, block);
        if (blockContent === undefined) {
          return err(new Error(`No heading named "${block}" found in ${path}.`));
        }
        return ok(blockContent);
      } catch (e) {
        return err(e);
      }
    },
  );
}
