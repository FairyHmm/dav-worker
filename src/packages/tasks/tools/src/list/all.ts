import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { resolveKnownCategoryColor } from "../deps";
import { ok, err } from "../utils";
import { ListCategorySchema } from "../utils/schemas";
import {
  withBatchSupport,
  runBatchTool,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape() {
  // No required(): an omitted category just means "all lists", same
  // as today's no-arg call.
  return { category: ListCategorySchema };
}

type AllItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerListAllTool(
  server: McpServer,
  deps: TaskToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
    "list_all",
    {
      description: "List all existing task lists.",
      annotations: {
        title: "List Task Lists",
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
      runBatchTool(params, itemShape, err, (item: AllItem) =>
        listAllItem(deps, item),
      ),
  );
}

async function listAllItem(deps: TaskToolsDeps, item: AllItem) {
  const { category } = item;
  try {
    let lists = await deps.storage.listAll();
    // Mirrors list_create's own category->color resolution
    // (resolveKnownCategoryColor, deps.ts) so callers filter by
    // the same vocabulary they create with — never asks the
    // caller for a raw hex value.
    if (category !== undefined) {
      const color = resolveKnownCategoryColor(deps, category);
      lists = lists.filter((l) => l.color === color);
    }
    if (lists.length === 0) return ok("No task lists found.");
    const lines = lists.map((l) => `${l.displayName}  (slug: ${l.slug})`);
    return ok(lines.join("\n"));
  } catch (e) {
    return err(e);
  }
}
