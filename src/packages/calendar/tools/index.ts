import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarToolsDeps } from "./src/deps.js";
import { registerScheduleListTool } from "./src/schedule/list.js";
import { registerScheduleCreateTool } from "./src/schedule/create.js";
import { registerScheduleUpdateTool } from "./src/schedule/update.js";
import { registerScheduleDeleteTool } from "./src/schedule/delete.js";
import { registerScheduleFreeTool } from "./src/schedule/free.js";

export type { CalendarToolsDeps } from "./src/deps.js";
// TODO-MONOREPO 9e: config parsing exposed publicly so app/worker (and
// app/local) can fetch the session's calendars.csv at runtime and hand the
// parsed result into CalendarToolsDeps.config. One CSV, one row per
// calendar (category, slug, color — all required, all mutually unique),
// parsed into indexed lookup maps rather than a raw row array so every
// direction (category->slug, category->color, slug->row, color->category)
// is O(1).
export {
  parseCalendarConfig,
  resolveCalendarName,
  resolveCategoryColor,
  resolveCategoryByColor,
  allCalendarNames,
  allCategories,
  type CalendarConfig,
  type CalendarRow,
} from "./src/calendars.js";
// Exported for app/worker's resolveEventDue (tasks/tools' one sanctioned
// cross-domain edge, SPEC-MONOREPO.md A.7) — app/worker is the sole wiring
// point and is allowed to depend on calendar/tools directly; this reuses
// the same cross-calendar UID search that schedule_update/delete use
// internally rather than duplicating it or living in its own package.
export { findEventAcrossCalendars, formatWarnings } from "./src/utils/find.js";
// Exported alongside findEventAcrossCalendars for the same reason: a
// resolved event's calendar-data can hold a recurring master plus detached
// RECURRENCE-ID overrides as sibling VEVENTs in one resource. app/worker's
// resolveEventDue needs the master's DTSTART specifically, not whichever
// VEVENT parses first — same distinction schedule_update/delete already
// make internally.
export { findMasterEvent } from "./src/utils/mapping.js";

// Public entry point for this package (SPEC-MONOREPO.md A.5): takes only
// CalendarToolsDeps (a CalendarStorage implementation), never a platform
// type like Env — so app/worker and app/local can both call this with
// their own conforming storage, unchanged.
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
