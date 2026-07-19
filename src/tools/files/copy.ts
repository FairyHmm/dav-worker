import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav/index.js";
import { ok, err } from "../../utils.js";
import {
  PathSchema,
  LocationSchema,
  ForceSchema,
  formatConflict,
} from "./schemas.js";
import { resolveLocation } from "../../locations/index.js";

export function registerCopyTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_files_copy",
    {
      description:
        "Copy a file or folder in the Nextcloud vault. " +
        "By default, refuses to overwrite an existing destination and returns its metadata instead. " +
        "Set force=true to overwrite without warning. Pass `srcLocation`/`dstLocation` " +
        "instead of `src`/`dst` to use named location shortcuts.",
      inputSchema: {
        src: PathSchema.describe("Source path").optional(),
        dst: PathSchema.describe("Destination path").optional(),
        srcLocation: LocationSchema,
        dstLocation: LocationSchema,
        force: ForceSchema,
      },
    },
    async ({ src: srcArg, dst: dstArg, srcLocation, dstLocation, force }) => {
      try {
        const src = srcLocation ? resolveLocation(srcLocation) : (srcArg ?? "");
        const dst = dstLocation ? resolveLocation(dstLocation) : (dstArg ?? "");
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
