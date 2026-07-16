import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListTool } from "./list.js";
import { registerReadTool } from "./read.js";
import { registerWriteTool } from "./write.js";
import { registerCreateFolderTool } from "./mkdir.js";
import { registerDeleteTool } from "./delete.js";
import { registerMoveTool } from "./move.js";
import { registerOutlineTool } from "./outline.js";

export function registerFilesTools(server: McpServer, env: Env): void {
  registerListTool(server, env);
  registerReadTool(server, env);
  registerWriteTool(server, env);
  registerCreateFolderTool(server, env);
  registerDeleteTool(server, env);
  registerMoveTool(server, env);
  registerOutlineTool(server, env);
}
