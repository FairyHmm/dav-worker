import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./src/deps.js";
import { registerListTool } from "./src/list.js";
import { registerReadTool } from "./src/read.js";
import { registerWriteTool } from "./src/write.js";
import { registerCreateFolderTool } from "./src/mkdir.js";
import { registerDeleteTool } from "./src/delete.js";
import { registerMoveTool } from "./src/move.js";
import { registerOutlineTool } from "./src/outline.js";
import { registerStatTool } from "./src/stat.js";
import { registerCopyTool } from "./src/copy.js";

export type { FileToolsDeps } from "./src/deps.js";

// Public entry point for this package (SPEC-MONOREPO.md A.5): takes only
// FileToolsDeps (a FileStorage implementation), never a platform type like
// Env — mirrors calendar/tools' registerCalendarTools.
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
