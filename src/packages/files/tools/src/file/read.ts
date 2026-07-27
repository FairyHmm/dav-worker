import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils.js";
import {
  BlockSchema,
  FromSchema,
  LocationSchema,
  PathSchema,
  ToSchema,
} from "../schemas.js";
import { resolveTarget } from "@dav-worker/files-parser";

export function registerReadTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "file_read",
    {
      description:
        "Read a text file. Returns an error for binary files. Pass `block` " +
        "with a heading title to read only that section (including nested " +
        "subheadings), or `from`/`to` for a 1-indexed line range, instead of " +
        "the whole file. `location` can name a shortcut base, with `path` " +
        "as a relative addition onto it.",
      inputSchema: {
        path: PathSchema.optional(),
        location: LocationSchema,
        block: BlockSchema,
        from: FromSchema,
        to: ToSchema,
      },
    },
    async ({ path: pathArg, location, block, from, to }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        const { content } = await client.read(path);

        const target = resolveTarget({ block, from, to });

        switch (target.kind) {
          case "whole-file":
            return ok(content);
          case "markdown": {
            const result = target.handler.read(content, target.address);
            if (result === undefined) {
              return err(
                new Error(`No heading named "${block}" found in ${path}.`),
              );
            }
            return ok(result);
          }
          case "raw": {
            const result = target.handler.read(content, target.address);
            if (result === undefined) {
              return err(
                new Error(
                  `Line range ${from}-${to ?? from} is out of bounds in ${path}.`,
                ),
              );
            }
            return ok(result);
          }
        }
      } catch (e) {
        return err(e);
      }
    },
  );
}
