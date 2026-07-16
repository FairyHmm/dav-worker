import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebDAVClient } from "../../clients/webdav.js";
import { writeBlock } from "../../parser/block-write.js";
import { ok, err } from "../../utils.js";
import { BlockSchema, ModeSchema, PathSchema, ScopeSchema } from "./schemas.js";

export function registerWriteTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_write",
    "Write text content to a file in the Nextcloud vault. Without `block`, " +
      "overwrites (or creates) the whole file. With `block`, patches just " +
      "one heading's section — see `scope` and `mode`.",
    {
      path: PathSchema,
      content: z.string().describe("Text content to write"),
      block: BlockSchema,
      scope: ScopeSchema,
      mode: ModeSchema,
    },
    async ({ path, content, block, scope, mode }) => {
      try {
        const client = new WebDAVClient(env);

        if (block === undefined) {
          const { created } = await client.write(path, content);
          return ok(created ? `Created: ${path}` : `Updated: ${path}`);
        }

        const { content: existing } = await client.read(path);
        const updated = writeBlock(existing, block, content, scope, mode);
        if (updated === undefined) {
          return err(
            new Error(`No heading named "${block}" found in ${path}.`),
          );
        }

        await client.write(path, updated);
        return ok(`Updated block "${block}" (${scope}/${mode}) in ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
