import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarToolsDeps } from "./src/deps.js";
import { registerScheduleListTool } from "./src/list.js";
import { registerScheduleCreateTool } from "./src/create.js";
import { registerScheduleUpdateTool } from "./src/update.js";
import { registerScheduleDeleteTool } from "./src/delete.js";
import { registerScheduleFreeTool } from "./src/free.js";

export type { CalendarToolsDeps } from "./src/deps.js";

// Public entry point for this package (SPEC-MONOREPO.md A.5): takes only
// CalendarToolsDeps (a CalendarStorage implementation), never a platform
// type like Env — so app/worker and app/local can both call this with
// their own conforming storage, unchanged.
export function registerCalendarTools(server: McpServer, deps: CalendarToolsDeps): void {
  registerScheduleListTool(server, deps);
  registerScheduleCreateTool(server, deps);
  registerScheduleUpdateTool(server, deps);
  registerScheduleDeleteTool(server, deps);
  registerScheduleFreeTool(server, deps);
}
