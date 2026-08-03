import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { FileToolsDeps } from "./src/deps";
import { registerListTool } from "./src/dir/list";
import { registerReadTool } from "./src/file/read";
import { registerWriteTool } from "./src/file/write";
import { registerCreateFolderTool } from "./src/dir/create";
import { registerDeleteTool } from "./src/entry/delete";
import { registerMoveTool } from "./src/entry/move";
import { registerOutlineTool } from "./src/file/outline";
import { registerStatTool } from "./src/entry/stat";
import { registerCopyTool } from "./src/entry/copy";

export type { FileToolsDeps } from "./src/deps";

export function registerFileTools(server: McpServer, deps: FileToolsDeps): void {
  registerListTool(server, deps);
  registerReadTool(server, deps);
  registerWriteTool(server, deps);
  registerCreateFolderTool(server, deps);
  registerDeleteTool(server, deps);
  registerMoveTool(server, deps);
  registerOutlineTool(server, deps);
  registerStatTool(server, deps);
  registerCopyTool(server, deps);
}
