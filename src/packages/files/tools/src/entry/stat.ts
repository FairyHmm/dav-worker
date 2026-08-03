import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err } from "../utils/response";
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

type StatItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerStatTool(server: McpServer, deps: FileToolsDeps): void {
  const itemShape = createItemShape();

  server.registerTool(
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
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: StatItem) =>
        statEntryItem(deps, item),
      ),
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
