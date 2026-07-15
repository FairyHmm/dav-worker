import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema, ForceSchema, formatConflict } from "./schemas.js";

export function registerMoveTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_move",
    "Move or rename a file or folder in the Nextcloud vault. " +
      "By default, refuses to overwrite an existing destination and returns its metadata instead. " +
      "Set force=true to overwrite without warning.",
    {
      src: PathSchema.describe("Source path"),
      dst: PathSchema.describe("Destination path"),
      force: ForceSchema,
    },
    async ({ src, dst, force }) => {
      try {
        const client = new WebDAVClient(env);
        const result = await client.move(src, dst, force);

        if (!result.moved) {
          return ok(formatConflict(result.conflict!, "force=true"));
        }

        return ok(`Moved: ${src} → ${dst}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
