import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils/index.js";
import {
  PathSchema,
  LocationSchema,
  ForceSchema,
  formatConflict,
} from "../schemas.js";

export function registerCopyTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "entry_copy",
    {
      description:
        "Copy a file or directory. `srcLocation`/`dstLocation` can each " +
        "name a shortcut base, with `src`/`dst` as a relative addition " +
        "onto them.",
      annotations: {
        title: "Copy Entry",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
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
