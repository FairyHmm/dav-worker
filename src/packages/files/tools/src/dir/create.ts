import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err, defineTool } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import { PathSchema, LocationSchema } from "../utils/schemas";
import { locked, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    path: PathSchema.optional(),
    // location locked(): shared base a batch's relative paths hang off of.
    location: locked(LocationSchema),
  };
}

type CreateItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerDirCreateTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
): void {
  defineTool(
    server,
    "files",
    disabled,
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
      itemShape: createItemShape(),
    },
    (item: CreateItem) => createDirItem(deps, item),
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
