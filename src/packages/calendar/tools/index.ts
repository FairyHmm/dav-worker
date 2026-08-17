import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { DisabledShape } from "@dav-worker/config-parser";
import type { ToolEntry } from "@dav-worker/mcp-utils";
import type { CalendarToolsDeps } from "./src/deps";

import { registerScheduleListTool } from "./src/schedule/list";
import { registerScheduleCreateTool } from "./src/schedule/create";
import { registerScheduleUpdateTool } from "./src/schedule/update";
import { registerScheduleDeleteTool } from "./src/schedule/delete";
import { registerScheduleFreeTool } from "./src/schedule/free";

export type { CalendarToolsDeps } from "./src/deps";
// Exposed so config/parser can parse the merged config.toml's [calendars]
// table and hand the result into CalendarToolsDeps.config.
export {
  parseCalendarConfig,
  resolveCalendarName,
  resolveCategoryColor,
  resolveCategoryByColor,
  allCalendarNames,
  allCategories,
  type CalendarConfig,
  type CalendarRow,
  type RawCalendarTable,
} from "./src/calendars";
// Exported for app/worker's resolveEventDue (tasks/tools' one sanctioned
// cross-domain edge, SPEC-MONOREPO.md A.7) — reuses the same cross-calendar
// UID search schedule_update/delete use internally.
export { findEventAcrossCalendars, formatWarnings } from "./src/utils/find";
// A resolved event can hold a recurring master plus detached RECURRENCE-ID
// overrides as sibling VEVENTs — resolveEventDue needs the master's
// DTSTART specifically, not whichever VEVENT parses first.
export { findMasterEvent } from "./src/utils/mapping";

export function registerCalendarTools(
  server: McpServer,
  deps: CalendarToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  registerScheduleListTool(server, deps, disabled, collector);
  registerScheduleCreateTool(server, deps, disabled, collector);
  registerScheduleUpdateTool(server, deps, disabled, collector);
  registerScheduleDeleteTool(server, deps, disabled, collector);
  registerScheduleFreeTool(server, deps, disabled, collector);
}
