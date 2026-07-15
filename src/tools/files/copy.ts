import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { PathSchema, ForceSchema, formatConflict } from "./schemas.js";

export function registerCopyTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_copy",
    "Copy a file or folder in the Nextcloud vault. " +
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
        const result = await client.copy(src, dst, force);

        if (!result.copied) {
          return ok(formatConflict(result.conflict!, "force=true"));
        }

        return ok(`Copied: ${src} → ${dst}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
