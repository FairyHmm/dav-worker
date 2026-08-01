import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { ok, err } from "../utils.js";
import { TaskIdSchema } from "../utils/schemas.js";
import { findTaskAcrossLists, formatWarnings } from "../utils/find.js";
import { withBatchSupport, runBatchTool, required, type Resolved } from "@dav-worker/batch-core";

// id is the only field — nothing to lock() against (no second field it
// could diverge from), but it must be required() since an item can't
// meaningfully omit its own identity and inherit a top-level default
// the way `list`/`title` can on task_create.
const itemShape = {
  id: required(TaskIdSchema),
};

export function registerTaskDeleteTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "task_delete",
    {
      description:
        "Delete a task by id. No-op, not an error, if the id doesn't exist.",
      annotations: {
        title: "Delete Task",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, async ({ id }: Resolved<typeof itemShape, "id">) => {
        try {
          const { found, warnings } = await findTaskAcrossLists(deps.storage, id);
          if (!found) {
            // Same reasoning as schedule_delete: if any list was skipped
            // (404), report it rather than a clean "if it existed" no-op
            // that could be hiding a real, undeleted task.
            return ok(`${formatWarnings(warnings)}Deleted task (id: ${id}), if it existed.`);
          }
          await deps.storage.delete(found.list, id);
          return ok(`${formatWarnings(warnings)}Deleted task (id: ${id}) from ${found.list}.`);
        } catch (e) {
          return err(e);
        }
      }),
  );
}
