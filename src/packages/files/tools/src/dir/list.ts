import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { ok, err } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import { PathSchema, DepthSchema, LocationSchema } from "../utils/schemas";
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
    depth: DepthSchema,
  };
}

type ListItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerListTool(server: McpServer, deps: FileToolsDeps): void {
  const itemShape = createItemShape();

  server.registerTool(
    "dir_list",
    {
      description: "List the contents of a directory.",
      annotations: {
        title: "List Directory",
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
      runBatchTool(params, itemShape, err, (item: ListItem) =>
        listDirItem(deps, item),
      ),
  );
}

async function listDirItem(deps: FileToolsDeps, item: ListItem) {
  const { path: pathArg, location, depth } = item;
  try {
    // allowRoot: an omitted path/location here means "list the vault
    // root," a documented and intended default for this tool only.
    const path = resolvePath(
      deps.config,
      { path: pathArg, location },
      { allowRoot: true },
    );
    const entries = await deps.storage.list(path, depth);
    if (entries.length === 0) return ok("Directory is empty.");

    const lines = entries.map((e) => {
      const kind = e.isDirectory ? "DIR " : "FILE";
      const size = e.size != null ? ` (${e.size} bytes)` : "";
      const label = depth === 1 ? e.name : e.path;
      return `${kind}  ${label}${size}`;
    });
    return ok(lines.join("\n"));
  } catch (e) {
    return err(e);
  }
}
