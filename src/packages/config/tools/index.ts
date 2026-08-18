import type { McpServer } from "@modelcontextprotocol/server";
import type { DisabledShape } from "@dav-worker/config-parser";
import type { ToolEntry } from "@dav-worker/mcp-utils";
import type { ConfigToolsDeps } from "./src/deps";

import { registerConfigGetTool } from "./src/config/get";
import { registerConfigSetTool } from "./src/config/set";

export type { ConfigToolsDeps, ConfigStorage } from "./src/deps";

export function registerConfigTools(
  server: McpServer,
  deps: ConfigToolsDeps,
  disabled: DisabledShape,
  collector: ToolEntry[],
): void {
  registerConfigGetTool(server, deps, disabled, collector);
  registerConfigSetTool(server, deps, disabled, collector);
}
