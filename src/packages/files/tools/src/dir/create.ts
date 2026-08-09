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
    // location locked(): shared base a batch's relative paths hang off of.
    location: locked(LocationSchema),
  };
}

type CreateItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerCreateFolderTool(
  server: McpServer,
  deps: FileToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
    "dir_create",
    {
      description:
        "Create a directory. Succeeds silently if it already exists.",
      annotations: {
        title: "Create Directory",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: CreateItem) =>
        createDirItem(deps, item),
      ),
  );
}

async function createDirItem(deps: FileToolsDeps, item: CreateItem) {
  const { path: pathArg, location } = item;
  try {
    const path = resolvePath(deps.config, { path: pathArg, location });
    const { alreadyExists } = await deps.storage.mkdir(path);
    return ok(alreadyExists ? `Already exists: ${path}` : `Created: ${path}`);
  } catch (e) {
    return err(e);
  }
}
