import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err, defineTool } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import { LocationSchema, PathSchema, TargetSchema } from "../utils/schemas";
import { resolveTarget } from "@dav-worker/files-parser";
import { locked, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    path: PathSchema.optional(),
    location: locked(LocationSchema),
    target: TargetSchema,
  };
}

type ReadItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerFileReadTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
): void {
  defineTool(
    server,
    "files",
    disabled,
    "file_read",
    {
      description: "Read a text file.",
      annotations: {
        title: "Read File",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: ReadItem) => readFileItem(deps, item),
  );
}

async function readFileItem(deps: FileToolsDeps, item: ReadItem) {
  const { path: pathArg, location, target } = item;
  try {
    const path = resolvePath(deps.config, { path: pathArg, location });
    const { content } = await deps.storage.read(path);

    const resolved = resolveTarget(target);
    if (resolved.kind === "whole-file") return ok(content);

    const result = resolved.read(content);
    return result === undefined
      ? err(new Error(resolved.notFoundError))
      : ok(result);
  } catch (e) {
    return err(e);
  }
}
