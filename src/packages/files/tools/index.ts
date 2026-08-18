import type { McpServer } from "@modelcontextprotocol/server";
import type { DisabledShape } from "@dav-worker/config-parser";
import type { ToolEntry } from "@dav-worker/mcp-utils";
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
  collector?: ToolEntry[],
): void {
  registerFileReadTool(server, deps, disabled, collector);
  registerFileWriteTool(server, deps, disabled, collector);
  registerFileOutlineTool(server, deps, disabled, collector);
  registerDirListTool(server, deps, disabled, collector);
  registerDirCreateTool(server, deps, disabled, collector);
  registerEntryCopyTool(server, deps, disabled, collector);
  registerEntryMoveTool(server, deps, disabled, collector);
  registerEntryDeleteTool(server, deps, disabled, collector);
  registerEntryStatTool(server, deps, disabled, collector);
}
