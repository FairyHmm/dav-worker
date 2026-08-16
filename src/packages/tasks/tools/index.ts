import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { DisabledShape } from "@dav-worker/config-parser";
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
): void {
  registerListCreateTool(server, deps, disabled);
  registerListDeleteTool(server, deps, disabled);
  registerListAllTool(server, deps, disabled);
  registerTaskCreateTool(server, deps, disabled);
  registerTaskListTool(server, deps, disabled);
  registerTaskUpdateTool(server, deps, disabled);
  registerTaskDeleteTool(server, deps, disabled);
}
