import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { DisabledShape } from "@dav-worker/config-parser";
import type { FileToolsDeps } from "./src/deps";

import { registerFileReadTool } from "./src/file/read";
import { registerFileWriteTool } from "./src/file/write";
import { registerFileOutlineTool } from "./src/file/outline";
import { registerDirListTool } from "./src/dir/list";
import { registerDirCreateTool } from "./src/dir/create";
import { registerEntryCopyTool } from "./src/entry/copy";
import { registerEntryMoveTool } from "./src/entry/move";
import { registerEntryDeleteTool } from "./src/entry/delete";
import { registerEntryStatTool } from "./src/entry/stat";

export type { FileToolsDeps } from "./src/deps";

export function registerFileTools(
  server: McpServer,
  deps: FileToolsDeps,
  disabled: DisabledShape,
): void {
  registerFileReadTool(server, deps, disabled);
  registerFileWriteTool(server, deps, disabled);
  registerFileOutlineTool(server, deps, disabled);
  registerDirListTool(server, deps, disabled);
  registerDirCreateTool(server, deps, disabled);
  registerEntryCopyTool(server, deps, disabled);
  registerEntryMoveTool(server, deps, disabled);
  registerEntryDeleteTool(server, deps, disabled);
  registerEntryStatTool(server, deps, disabled);
}
