import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./deps.js";
import { ok, err } from "./utils.js";
import {
  PathSchema,
  LocationSchema,
  ForceSchema,
  formatConflict,
} from "./schemas.js";
import { resolveLocation } from "@dav-worker/files-locations";

export function registerMoveTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "nc_files_move",
    {
      description:
        "Move or rename a file or folder in the Nextcloud vault. " +
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
        const src = srcLocation ? resolveLocation(deps.config, srcLocation) : (srcArg ?? "");
        const dst = dstLocation ? resolveLocation(deps.config, dstLocation) : (dstArg ?? "");
        const client = deps.storage;
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
