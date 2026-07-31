import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileToolsDeps } from "../deps.js";
import { ok, err, resolvePath, combineWholeFile } from "../utils/index.js";
import {
  LocationSchema,
  ModeSchema,
  PathSchema,
  TargetSchema,
} from "../schemas.js";
import { resolveTarget } from "@dav-worker/files-parser";

export function registerWriteTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "file_write",
    {
      description:
        "Write text content to a file, replacing, appending to, or " +
        "prepending to the whole file, a markdown heading, or a line " +
        "range.",
      annotations: {
        title: "Write File",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        path: PathSchema.optional(),
        location: LocationSchema,
        content: z.string().describe("Text content to write"),
        target: TargetSchema,
        mode: ModeSchema,
      },
    },
    async ({ path: pathArg, location, content, target, mode }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location });
        const client = deps.storage;
        const resolved = resolveTarget(target);

        if (resolved.kind === "whole-file") {
          if (mode === "replace") {
            const { created } = await client.write(path, content);
            return ok(created ? `Created: ${path}` : `Updated: ${path}`);
          }
          const { combined, fileExists } = await combineWholeFile(client, path, content, mode);
          const { created } = await client.write(path, combined);
          return ok(
            fileExists
              ? `${mode === "append" ? "Appended to" : "Prepended to"}: ${path}`
              : `Created: ${path}${created ? "" : " (unexpectedly already existed)"}`,
          );
        }

        const { content: existing } = await client.read(path);
        const updated = resolved.write(existing, content, mode);
        if (updated === undefined) {
          return err(new Error(resolved.notFoundError));
        }
        await client.write(path, updated);
        return ok(`Updated ${resolved.describe(mode)} in ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
