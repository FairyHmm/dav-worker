import type {
  CalendarStorage,
  ComponentType,
  ReportEntry,
} from "@dav-worker/calendar-contracts";
import { allCalendarNames, type CalendarConfig } from "../calendars.js";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";

export interface FindAcrossCalendarsResult {
  found: { calendarName: string; entry: ReportEntry } | null;
  // Calendars that 404'd (stale slug, deleted, no access) — surfaced so
  // "not found" doesn't silently hide a rename bug.
  warnings: string[];
}

function calendarWarning(calendarName: string): string {
  return (
    `Calendar "${calendarName}" returned 404 (its slug in calendars.toml may be ` +
    `stale — check it against the calendar's actual URI on the server, e.g. after ` +
    `a rename). Skipped for this search.`
  );
}

// CalDAV has no cross-calendar UID index, so this tries each configured
// calendar's REPORT in turn. A 404 on one calendar (stale slug, deleted,
// no access) doesn't abort the search — it's just "not in this one".
// Any other error is real and surfaces immediately.
//
// Catches WebDAVHttpError specifically since CalendarStorage's contract
// doesn't define a not-found shape yet — fine for the one backend that
// exists today.
export async function findEventAcrossCalendars(
  storage: CalendarStorage,
  config: CalendarConfig,
  componentType: ComponentType,
  uid: string,
): Promise<FindAcrossCalendarsResult> {
  const warnings: string[] = [];
  for (const calendarName of allCalendarNames(config)) {
    try {
      const entry = await storage.findByUid(calendarName, componentType, uid);
      if (entry) return { found: { calendarName, entry }, warnings };
    } catch (e) {
      if (e instanceof WebDAVHttpError && e.status === 404) {
        warnings.push(calendarWarning(calendarName));
        continue;
      }
      throw e;
    }
  }
  return { found: null, warnings };
}

// Shared prefix so every schedule tool surfaces skipped calendars the same way.
export function formatWarnings(warnings: string[]): string {
  return warnings.length ? `⚠️ ${warnings.join(" ")}\n\n` : "";
}
