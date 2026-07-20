import type { ICalComponent } from "../../../ical/parse.js";
import type { ReportEntry } from "../../../clients/caldav/report.js";
import { parseCalendar } from "../../../ical/parse.js";
import {
  newEvent,
  getText,
  setText,
  getDateTime,
  setDateTime,
  nowStamp,
  findComponent,
  isoToBasic,
} from "../../../ical/component.js";
import { setRRule } from "../../../ical/recurrence.js";

// Maps dav-worker's own request/response field names (title, start, end,
// description, location) onto RFC 5545 VEVENT properties, via ical/'s
// generic get/set helpers. This mapping is deliberately NOT in ical/ itself
// — ical/ knows RFC 5545, not dav-worker's schema (see SPEC.md's project
// structure notes).

export interface EventFields {
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
}

export interface EventSummary {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
}

export function buildEventComponent(
  uid: string,
  fields: Required<Pick<EventFields, "title" | "start" | "end">> & EventFields,
): ICalComponent {
  const event = newEvent(uid);
  setText(event, "SUMMARY", fields.title);
  if (fields.description) setText(event, "DESCRIPTION", fields.description);
  if (fields.location) setText(event, "LOCATION", fields.location);
  setDateTime(event, "DTSTART", fields.start);
  setDateTime(event, "DTEND", fields.end);
  return event;
}

// Applies only the fields present in `fields` (undefined = leave as-is),
// then bumps DTSTAMP/LAST-MODIFIED — mirrors the Python reference's
// "update only provided properties" merge behaviour.
export function applyEventFields(event: ICalComponent, fields: EventFields): void {
  if (fields.title !== undefined) setText(event, "SUMMARY", fields.title);
  if (fields.description !== undefined) setText(event, "DESCRIPTION", fields.description);
  if (fields.location !== undefined) setText(event, "LOCATION", fields.location);
  if (fields.start !== undefined) setDateTime(event, "DTSTART", fields.start);
  if (fields.end !== undefined) setDateTime(event, "DTEND", fields.end);

  const stamp = nowStamp();
  event.properties["DTSTAMP"] = [{ value: stamp, params: {} }];
  event.properties["LAST-MODIFIED"] = [{ value: stamp, params: {} }];
}

// Friendlier daily/weekly schema (SPEC-SCHEDULES.md "Recurring events"),
// not raw RRULE input. `until`, if given, is an ISO date/date-time like the
// rest of dav-worker's schema — converted to RFC 5545 basic format here so
// callers never have to think in RRULE's wire format.
export interface RecurrenceFields {
  freq: "daily" | "weekly";
  interval?: number;
  until?: string;
}

export function applyRecurrence(event: ICalComponent, recurrence: RecurrenceFields): void {
  setRRule(event, {
    freq: recurrence.freq === "daily" ? "DAILY" : "WEEKLY",
    interval: recurrence.interval,
    until: recurrence.until !== undefined ? isoToBasic(recurrence.until) : undefined,
  });
}

// Builds a travel-buffer VEVENT (SPEC-SCHEDULES.md): a plain event carrying
// a custom X-DAV-WORKER-TRAVEL-FOR property pointing at the parent event's
// UID. Deliberately separate from buildEventComponent — buffers have no
// description/location and always need the linking property set.
export function buildTravelBufferComponent(
  uid: string,
  parentUid: string,
  title: string,
  start: string,
  end: string,
): ICalComponent {
  const event = newEvent(uid);
  setText(event, "SUMMARY", title);
  setText(event, "X-DAV-WORKER-TRAVEL-FOR", parentUid);
  setDateTime(event, "DTSTART", start);
  setDateTime(event, "DTEND", end);
  return event;
}

export function extractEventSummary(entry: ReportEntry): EventSummary | null {
  if (!entry.calendarData) return null;
  const cal = parseCalendar(entry.calendarData);
  const vevent = findComponent(cal, "VEVENT");
  if (!vevent) return null;

  return {
    uid: getText(vevent, "UID") ?? "",
    title: getText(vevent, "SUMMARY") ?? "",
    description: getText(vevent, "DESCRIPTION"),
    location: getText(vevent, "LOCATION"),
    start: getDateTime(vevent, "DTSTART")?.raw ?? "",
    end: getDateTime(vevent, "DTEND")?.raw ?? "",
  };
}
