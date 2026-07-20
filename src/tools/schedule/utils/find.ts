import type { CalDAVClient } from "../../../clients/caldav/index.js";
import type { ComponentType, ReportEntry } from "../../../clients/caldav/report.js";
import { allCalendarNames } from "../../../config/calendars.js";
import { NextcloudHttpError } from "../../../clients/base.js";

export interface FindAcrossCalendarsResult {
  found: { calendarName: string; entry: ReportEntry } | null;
  // Calendars that 404'd during the search (stale/renamed slug in
  // calendars.toml, deleted calendar, no access). These don't abort the
  // search, but a caller getting "not found" or an incomplete cross-calendar
  // result while calendars were silently skipped needs to know — otherwise
  // a rename-without-updating-the-config bug just looks like "the event
  // doesn't exist" with no lead on why.
  warnings: string[];
}

function calendarWarning(calendarName: string): string {
  return (
    `Calendar "${calendarName}" returned 404 (its slug in calendars.toml may be ` +
    `stale — check it against the calendar's actual URI on the server, e.g. after ` +
    `a rename). Skipped for this search.`
  );
}

// nc_schedule_update/delete take only an `id` (CalDAV UID) — no category —
// per SPEC-SCHEDULES.md's examples. CalDAV has no cross-calendar UID index,
// so resolving "which calendar has this UID" means trying each configured
// calendar's REPORT in turn. With 5 calendars this is cheap; if the category
// list grows a lot this would want a cache, but that's premature for now.
//
// A calendar 404ing (misconfigured slug, deleted calendar, no access) must
// not abort the whole search — it should just mean "not in this one", same
// as any other calendar not having the UID. Any other error (auth failure,
// network error, etc.) is real and should still surface immediately rather
// than being silently swallowed calendar-by-calendar.
export async function findEventAcrossCalendars(
  client: CalDAVClient,
  componentType: ComponentType,
  uid: string,
): Promise<FindAcrossCalendarsResult> {
  const warnings: string[] = [];
  for (const calendarName of allCalendarNames()) {
    try {
      const entry = await client.findByUid(calendarName, componentType, uid);
      if (entry) return { found: { calendarName, entry }, warnings };
    } catch (e) {
      if (e instanceof NextcloudHttpError && e.status === 404) {
        warnings.push(calendarWarning(calendarName));
        continue;
      }
      throw e;
    }
  }
  return { found: null, warnings };
}

// Shared "⚠️ ..." prefix formatting so every schedule tool surfaces skipped
// calendars the same way, whether the search still succeeded elsewhere or
// came up empty entirely.
export function formatWarnings(warnings: string[]): string {
  return warnings.length ? `⚠️ ${warnings.join(" ")}\n\n` : "";
}
