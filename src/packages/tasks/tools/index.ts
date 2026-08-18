import type { McpServer } from "@modelcontextprotocol/server";
import type { DisabledShape } from "@dav-worker/config-parser";
import type { ToolEntry } from "@dav-worker/mcp-utils";
import type { TaskToolsDeps } from "./src/deps";

import { registerTaskCreateTool } from "./src/task/create";
import { registerTaskListTool } from "./src/task/list";
import { registerTaskUpdateTool } from "./src/task/update";
import { registerTaskDeleteTool } from "./src/task/delete";
import { registerListCreateTool } from "./src/list/create";
import { registerListDeleteTool } from "./src/list/delete";
import { registerListAllTool } from "./src/list/all";

export type { TaskToolsDeps } from "./src/deps";

export function registerTaskTools(
  server: McpServer,
  deps: TaskToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  registerListCreateTool(server, deps, disabled, collector);
  registerListDeleteTool(server, deps, disabled, collector);
  registerListAllTool(server, deps, disabled, collector);
  registerTaskCreateTool(server, deps, disabled, collector);
  registerTaskListTool(server, deps, disabled, collector);
  registerTaskUpdateTool(server, deps, disabled, collector);
  registerTaskDeleteTool(server, deps, disabled, collector);
}
