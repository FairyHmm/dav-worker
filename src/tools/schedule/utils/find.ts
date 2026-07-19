import type { CalDAVClient } from "../../../clients/caldav/index.js";
import type { ComponentType, ReportEntry } from "../../../clients/caldav/report.js";
import { allCalendarNames } from "../../../config/calendars.js";

// nc_schedule_update/delete take only an `id` (CalDAV UID) — no category —
// per SPEC-SCHEDULES.md's examples. CalDAV has no cross-calendar UID index,
// so resolving "which calendar has this UID" means trying each configured
// calendar's REPORT in turn. With 5 calendars this is cheap; if the category
// list grows a lot this would want a cache, but that's premature for now.
export async function findEventAcrossCalendars(
  client: CalDAVClient,
  componentType: ComponentType,
  uid: string,
): Promise<{ calendarName: string; entry: ReportEntry } | null> {
  for (const calendarName of allCalendarNames()) {
    const entry = await client.findByUid(calendarName, componentType, uid);
    if (entry) return { calendarName, entry };
  }
  return null;
}
