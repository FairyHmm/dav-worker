import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils/index.js";
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
        "Read a text file. Returns an error for binary files. `block` " +
        "targets a markdown heading (its whole subtree); `from`/`to` " +
        "targets a 1-indexed line range; omit both to read the whole " +
        "file. `location` can name a shortcut base, with `path` as a " +
        "relative addition onto it.",
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
        if (target.kind === "whole-file") return ok(content);

        const result = target.read(content);
        return result === undefined ? err(new Error(target.notFoundError)) : ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
