import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { resolveKnownCategoryColor } from "../deps.js";
import { ok, err } from "../utils.js";
import { ListCategorySchema } from "../utils/schemas.js";
import { withBatchSupport, runBatchTool, type Resolved } from "@dav-worker/batch-core";

// category is the only field, and it's already optional (an omitted
// item just means "all lists", same as today's no-arg call) — no
// required()/locked() tags needed, unlike list_create's `name`.
const itemShape = { category: ListCategorySchema };

export function registerListAllTool(
  server: McpServer,
  deps: TaskToolsDeps,
): void {
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
      runBatchTool(
        params,
        itemShape,
        err,
        async ({ category }: Resolved<typeof itemShape, never>) => {
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
        },
      ),
  );
}
