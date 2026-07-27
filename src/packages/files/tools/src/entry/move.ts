import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils.js";
import {
  PathSchema,
  LocationSchema,
  ForceSchema,
  formatConflict,
} from "../schemas.js";

export function registerMoveTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "entry_move",
    {
      description:
        "Move or rename a file or directory. By default, refuses to " +
        "overwrite an existing destination and returns its metadata instead " +
        "— set force=true to overwrite without warning. `srcLocation`/" +
        "`dstLocation` can each name a shortcut base, with `src`/`dst` as a " +
        "relative addition onto them.",
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
        const src = resolvePath(deps.config, { path: srcArg, location: srcLocation });
        const dst = resolvePath(deps.config, { path: dstArg, location: dstLocation });
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
