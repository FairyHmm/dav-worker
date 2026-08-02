import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
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
): void {
  registerListCreateTool(server, deps);
  registerListDeleteTool(server, deps);
  registerListAllTool(server, deps);
  registerTaskCreateTool(server, deps);
  registerTaskListTool(server, deps);
  registerTaskUpdateTool(server, deps);
  registerTaskDeleteTool(server, deps);
}
