import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath, appendWholeFile } from "../utils/index.js";
import {
  BlockSchema,
  FromSchema,
  LocationSchema,
  ModeSchema,
  PathSchema,
  ScopeSchema,
  ToSchema,
} from "../schemas.js";
import { resolveTarget } from "@dav-worker/files-parser";

export function registerWriteTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "file_write",
    {
      description:
        "Write text content to a file. `block` (+ optional `scope`) " +
        "targets a markdown heading; `from`/`to` targets a 1-indexed line " +
        "range; omit both to target the whole file. `mode: 'replace'` " +
        "(default) overwrites the target, `mode: 'append'` adds after it " +
        "(end of file, end of block, or right after the line range). " +
        "`block` and `from`/`to` are mutually exclusive. `location` can " +
        "name a shortcut base, with `path` as a relative addition onto it.",
      inputSchema: {
        path: PathSchema.optional(),
        location: LocationSchema,
        content: z.string().describe("Text content to write"),
        block: BlockSchema,
        scope: ScopeSchema,
        mode: ModeSchema,
        from: FromSchema,
        to: ToSchema,
      },
    },
    async ({
      path: pathArg,
      location,
      content,
      block,
      scope,
      mode,
      from,
      to,
    }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        const target = resolveTarget({ block, scope, from, to });

        if (target.kind === "whole-file") {
          if (mode === "replace") {
            const { created } = await client.write(path, content);
            return ok(created ? `Created: ${path}` : `Updated: ${path}`);
          }
          const { combined, fileExists } = await appendWholeFile(client, path, content);
          const { created } = await client.write(path, combined);
          return ok(
            fileExists
              ? `Appended to: ${path}`
              : `Created: ${path}${created ? "" : " (unexpectedly already existed)"}`,
          );
        }

        const { content: existing } = await client.read(path);
        const updated = target.write(existing, content, mode);
        if (updated === undefined) {
          return err(new Error(target.notFoundError));
        }
        await client.write(path, updated);
        return ok(`Updated ${target.describe(mode)} in ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
