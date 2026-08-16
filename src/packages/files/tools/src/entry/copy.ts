import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err, defineTool } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import {
  PathSchema,
  LocationSchema,
  ForceSchema,
  formatConflict,
} from "../utils/schemas";
import { locked, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    src: PathSchema.describe("Source path").optional(),
    dst: PathSchema.describe("Destination path").optional(),
    // Two locked() bases, one per side of the copy.
    srcLocation: locked(LocationSchema),
    dstLocation: locked(LocationSchema),
    force: ForceSchema,
  };
}

type CopyItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerEntryCopyTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
): void {
  defineTool(
    server,
    "files",
    disabled,
    "entry_copy",
    {
      description: "Copy a file or directory.",
      annotations: {
        title: "Copy Entry",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: CopyItem) => copyEntryItem(deps, item),
  );
}

async function copyEntryItem(deps: FileToolsDeps, item: CopyItem) {
  const { src: srcArg, dst: dstArg, srcLocation, dstLocation, force } = item;
  try {
    const src = resolvePath(deps.config, {
      path: srcArg,
      location: srcLocation,
    });
    const dst = resolvePath(deps.config, {
      path: dstArg,
      location: dstLocation,
    });
    const result = await deps.storage.copy(src, dst, force);
    if (!result.copied) {
      return ok(formatConflict(result.conflict!, "force=true"));
    }
    return ok(`Copied: ${src} → ${dst}`);
  } catch (e) {
    return err(e);
  }
}
