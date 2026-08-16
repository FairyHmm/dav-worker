import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { DisabledShape } from "@dav-worker/config-parser";
import type { ConfigToolsDeps } from "./src/deps";

import { registerConfigGetTool } from "./src/config/get";
import { registerConfigSetTool } from "./src/config/set";

export type { ConfigToolsDeps, ConfigStorage } from "./src/deps";

export function registerConfigTools(
  server: McpServer,
  deps: ConfigToolsDeps,
  disabled: DisabledShape,
): void {
  registerConfigGetTool(server, deps, disabled);
  registerConfigSetTool(server, deps, disabled);
}
