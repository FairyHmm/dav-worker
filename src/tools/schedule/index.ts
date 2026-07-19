import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerScheduleListTool } from "./list.js";
import { registerScheduleCreateTool } from "./create.js";
import { registerScheduleUpdateTool } from "./update.js";
import { registerScheduleDeleteTool } from "./delete.js";
import { registerScheduleFreeTool } from "./free.js";

export function registerScheduleTools(server: McpServer, env: Env): void {
  registerScheduleListTool(server, env);
  registerScheduleCreateTool(server, env);
  registerScheduleUpdateTool(server, env);
  registerScheduleDeleteTool(server, env);
  registerScheduleFreeTool(server, env);
}
