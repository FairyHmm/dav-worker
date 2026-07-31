import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath } from "../utils/index.js";
import { LocationSchema, PathSchema, TargetSchema } from "../schemas.js";
import { resolveTarget } from "@dav-worker/files-parser";

export function registerReadTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "file_read",
    {
      description:
        "Read a text file — the whole file, a markdown heading, or a " +
        "line range. Returns an error for binary files.",
      annotations: {
        title: "Read File",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        path: PathSchema.optional(),
        location: LocationSchema,
        target: TargetSchema,
      },
    },
    async ({ path: pathArg, location, target }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        const { content } = await client.read(path);

        const resolved = resolveTarget(target);
        if (resolved.kind === "whole-file") return ok(content);

        const result = resolved.read(content);
        return result === undefined ? err(new Error(resolved.notFoundError)) : ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );
}
