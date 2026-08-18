import type { McpServer } from "@modelcontextprotocol/server";
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

type DeleteItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerEntryDeleteTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "files",
    disabled,
    "entry_delete",
    {
      description: "Delete a file or directory. No-op if it doesn't exist.",
      annotations: {
        title: "Delete Entry",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: DeleteItem) => deleteEntryItem(deps, item),
    undefined,
    collector,
  );
}

async function deleteEntryItem(deps: FileToolsDeps, item: DeleteItem) {
  const { path: pathArg, location } = item;
  try {
    const path = resolvePath(deps.config, { path: pathArg, location });
    await deps.storage.delete(path);
    return ok(`Deleted: ${path}`);
  } catch (e) {
    return err(e);
  }
}
