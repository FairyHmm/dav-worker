import type { McpServer } from "@modelcontextprotocol/server";
import type { FileToolsDeps } from "../deps";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { resolvePath } from "../utils/path";
import { PathSchema, DepthSchema, LocationSchema } from "../utils/schemas";
import { locked, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    path: PathSchema.optional(),
    location: locked(LocationSchema),
    depth: DepthSchema,
  };
}

type ListItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerDirListTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "files",
    disabled,
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
      itemShape: createItemShape(),
    },
    (item: ListItem) => listDirItem(deps, item),
    undefined,
    collector,
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
