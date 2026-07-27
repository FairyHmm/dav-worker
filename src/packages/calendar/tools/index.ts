import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarToolsDeps } from "./src/deps.js";
import { registerScheduleListTool } from "./src/schedule/list.js";
import { registerScheduleCreateTool } from "./src/schedule/create.js";
import { registerScheduleUpdateTool } from "./src/schedule/update.js";
import { registerScheduleDeleteTool } from "./src/schedule/delete.js";
import { registerScheduleFreeTool } from "./src/schedule/free.js";

export type { CalendarToolsDeps } from "./src/deps.js";
// TODO-MONOREPO 9e: config parsing exposed publicly so app/worker (and
// eventually app/local) can fetch the session's calendars.toml at runtime
// and hand the parsed result into CalendarToolsDeps.config.
export { parseCalendarConfig, type CalendarConfig } from "./src/calendars.js";

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
