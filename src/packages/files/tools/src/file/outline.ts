import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { outline } from "@dav-worker/files-parser";
import { resolveFromExtension } from "@dav-worker/files-types";
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

type OutlineItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerFileOutlineTool(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "files",
    disabled,
    "file_outline",
    {
      description:
        "Return the heading structure of a Markdown file as a nested tree, without body content.",
      annotations: {
        title: "Get File Outline",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(),
    },
    (item: OutlineItem) => outlineFileItem(deps, item),
    undefined,
    collector,
  );
}

async function outlineFileItem(deps: FileToolsDeps, item: OutlineItem) {
  const { path: pathArg, location } = item;
  try {
    const path = resolvePath(deps.config, { path: pathArg, location });
    const hint = resolveFromExtension(path);
    if (hint !== null && hint.contentType !== "text/markdown") {
      throw new Error(`Not a Markdown file: ${path}`);
    }
    const { content } = await deps.storage.read(path);
    return ok(JSON.stringify(outline(content), null, 2));
  } catch (e) {
    return err(e);
  }
}
