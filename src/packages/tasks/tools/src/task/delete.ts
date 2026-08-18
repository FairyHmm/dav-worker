import type { McpServer } from "@modelcontextprotocol/server";
import type { TaskToolsDeps } from "../deps";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { TaskIdSchema } from "../utils/schemas";
import { findTaskAcrossLists, formatWarnings } from "../utils/find";
import { required, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    // required(): an item can't omit its own identity the way
    // task_create's `list`/`title` can inherit a top-level default.
    id: required(TaskIdSchema),
  };
}

type DeleteItem = Resolved<ReturnType<typeof createItemShape>, "id">;

export function registerTaskDeleteTool(
  server: McpServer,
  deps: TaskToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "tasks",
    disabled,
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
      itemShape: createItemShape(),
    },
    (item: DeleteItem) => deleteTaskItem(deps, item),
    undefined,
    collector,
  );
}

async function deleteTaskItem(deps: TaskToolsDeps, item: DeleteItem) {
  const { id } = item;
  try {
    const { found, warnings } = await findTaskAcrossLists(deps.storage, id);
    if (!found) {
      // Same reasoning as schedule_delete: if any list was skipped
      // (404), report it rather than a clean "if it existed" no-op
      // that could be hiding a real, undeleted task.
      return ok(
        `${formatWarnings(warnings)}Deleted task (id: ${id}), if it existed.`,
      );
    }
    await deps.storage.delete(found.list, id);
    return ok(
      `${formatWarnings(warnings)}Deleted task (id: ${id}) from ${found.list}.`,
    );
  } catch (e) {
    return err(e);
  }
}
