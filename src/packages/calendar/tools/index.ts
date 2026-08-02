import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { CalendarToolsDeps } from "./src/deps";
import { registerScheduleListTool } from "./src/schedule/list";
import { registerScheduleCreateTool } from "./src/schedule/create";
import { registerScheduleUpdateTool } from "./src/schedule/update";
import { registerScheduleDeleteTool } from "./src/schedule/delete";
import { registerScheduleFreeTool } from "./src/schedule/free";

export type { CalendarToolsDeps } from "./src/deps";
// Exposed so app/worker (and app/local) can parse the session's
// calendars.csv and hand the result into CalendarToolsDeps.config.
export {
  parseCalendarConfig,
  resolveCalendarName,
  resolveCategoryColor,
  resolveCategoryByColor,
  allCalendarNames,
  allCategories,
  type CalendarConfig,
  type CalendarRow,
} from "./src/calendars";
// Exported for app/worker's resolveEventDue (tasks/tools' one sanctioned
// cross-domain edge, SPEC-MONOREPO.md A.7) — reuses the same cross-calendar
// UID search schedule_update/delete use internally.
export { findEventAcrossCalendars, formatWarnings } from "./src/utils/find";
// A resolved event can hold a recurring master plus detached RECURRENCE-ID
// overrides as sibling VEVENTs — resolveEventDue needs the master's
// DTSTART specifically, not whichever VEVENT parses first.
export { findMasterEvent } from "./src/utils/mapping";

// Public entry point (SPEC-MONOREPO.md A.5): takes only CalendarToolsDeps,
// never a platform type like Env, so app/worker and app/local can both
// call this unchanged.
export function registerCalendarTools(
  server: McpServer,
  deps: CalendarToolsDeps,
): void {
  registerScheduleListTool(server, deps);
  registerScheduleCreateTool(server, deps);
  registerScheduleUpdateTool(server, deps);
  registerScheduleDeleteTool(server, deps);
  registerScheduleFreeTool(server, deps);
}
