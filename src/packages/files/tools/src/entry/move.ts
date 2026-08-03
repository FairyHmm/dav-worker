import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err } from "../utils/response";
import { resolvePath } from "../utils/path";
import {
  PathSchema,
  LocationSchema,
  ForceSchema,
  formatConflict,
} from "../utils/schemas";
import {
  withBatchSupport,
  runBatchTool,
  locked,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape() {
  return {
    src: PathSchema.describe("Source path").optional(),
    dst: PathSchema.describe("Destination path").optional(),
    srcLocation: locked(LocationSchema),
    dstLocation: locked(LocationSchema),
    force: ForceSchema,
  };
}

type MoveItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerMoveTool(server: McpServer, deps: FileToolsDeps): void {
  const itemShape = createItemShape();

  server.registerTool(
    "entry_move",
    {
      description: "Move or rename a file or directory.",
      annotations: {
        title: "Move Entry",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: MoveItem) =>
        moveEntryItem(deps, item),
      ),
  );
}

async function moveEntryItem(deps: FileToolsDeps, item: MoveItem) {
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
    const result = await deps.storage.move(src, dst, force);
    if (!result.moved) {
      return ok(formatConflict(result.conflict!, "force=true"));
    }
    return ok(`Moved: ${src} → ${dst}`);
  } catch (e) {
    return err(e);
  }
}
