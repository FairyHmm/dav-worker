import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import { PathSchema, LocationSchema } from "../utils/schemas";
import {
  withBatchSupport,
  runBatchTool,
  locked,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape() {
  return {
    path: PathSchema.optional(),
    location: locked(LocationSchema),
  };
}

type DeleteItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerDeleteTool(
  server: McpServer,
  deps: FileToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
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
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: DeleteItem) =>
        deleteEntryItem(deps, item),
      ),
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
