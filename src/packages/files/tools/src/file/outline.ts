import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "../deps";
import { outline } from "@dav-worker/files-parser";
import { resolveFromExtension } from "@dav-worker/files-types";
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

type OutlineItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerOutlineTool(
  server: McpServer,
  deps: FileToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
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
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: OutlineItem) =>
        outlineFileItem(deps, item),
      ),
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
