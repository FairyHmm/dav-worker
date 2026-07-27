import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./src/deps.js";
import { registerListTool } from "./src/dir/list.js";
import { registerReadTool } from "./src/file/read.js";
import { registerWriteTool } from "./src/file/write.js";
import { registerCreateFolderTool } from "./src/dir/create.js";
import { registerDeleteTool } from "./src/entry/delete.js";
import { registerMoveTool } from "./src/entry/move.js";
import { registerOutlineTool } from "./src/file/outline.js";
import { registerStatTool } from "./src/entry/stat.js";
import { registerCopyTool } from "./src/entry/copy.js";

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
