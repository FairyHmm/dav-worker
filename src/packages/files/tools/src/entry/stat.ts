import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import { PathSchema, LocationSchema } from "../utils/schemas";
import { locked, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    path: PathSchema.optional(),
    location: locked(LocationSchema),
  };
}

type StatItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerEntryStatTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "files",
    disabled,
    "entry_stat",
    {
      description:
        "Get metadata for a file or directory (size, type, last modified).",
      annotations: {
        title: "Get Entry Metadata",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: StatItem) => statEntryItem(deps, item),
    undefined,
    collector,
  );
}

async function statEntryItem(deps: FileToolsDeps, item: StatItem) {
  const { path: pathArg, location } = item;
  try {
    const path = resolvePath(deps.config, { path: pathArg, location });
    const meta = await deps.storage.stat(path);
    return ok(JSON.stringify(meta, null, 2));
  } catch (e) {
    return err(e);
  }
}
