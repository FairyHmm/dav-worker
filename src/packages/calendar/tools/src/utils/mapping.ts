import type { ICalComponent } from "@dav-worker/calendar-ical";
import type { ReportEntry } from "@dav-worker/calendar-contracts";
import {
  parseCalendar,
  newEvent,
  getText,
  setText,
  getDateTime,
  setDateTime,
  removeProperty,
  nowStamp,
  findAllComponents,
  cloneComponent,
  isoToBasic,
  basicToIso,
  setRRule,
} from "@dav-worker/calendar-ical";

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
  // Present when this summary came from an <C:expand>-ed occurrence of a
  // recurring event (RECURRENCE-ID on the VEVENT) rather than a
  // non-recurring event or an un-expanded master. Same ISO shape that
  // occurrence-targeted update/delete will take as input, so callers can
  // round-trip a value straight from a list result into those calls.
  occurrence?: string;
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

// Occurrence-targeting helpers (SPEC-SCHEDULES.md "Recurring events").
// A VEVENT resource can hold a recurring master (no RECURRENCE-ID) plus
// zero or more detached override VEVENTs (RECURRENCE-ID set), all sharing
// one UID in one .ics resource. These distinguish the two and build a new
// override from the master.

export function findMasterEvent(events: ICalComponent[]): ICalComponent | undefined {
  return events.find((e) => !e.properties["RECURRENCE-ID"]);
}

export function findOccurrenceOverride(
  events: ICalComponent[],
  occurrenceIso: string,
): ICalComponent | undefined {
  const basic = isoToBasic(occurrenceIso);
  return events.find((e) => e.properties["RECURRENCE-ID"]?.[0]?.value === basic);
}

// Clones a recurring master into a standalone override VEVENT for one
// instance: same UID, RECURRENCE-ID set to the targeted occurrence, RRULE/
// EXDATE stripped (an override is a single instance, not itself recurring),
// DTSTART/DTEND shifted to the occurrence's start while preserving the
// master's original duration. Caller applies field edits on top via
// applyEventFields() afterward — this only handles the detach itself.
// Per SPEC-SCHEDULES.md's idempotence contract, callers must check
// findOccurrenceOverride() first and only fall back to this when no
// override exists yet for that occurrence.
export function detachOccurrence(master: ICalComponent, occurrenceIso: string): ICalComponent {
  const clone = cloneComponent(master);
  removeProperty(clone, "RRULE");
  removeProperty(clone, "EXDATE");

  const masterStart = getDateTime(master, "DTSTART");
  const masterEnd = getDateTime(master, "DTEND");
  const dtOpts = { allDay: masterStart?.isDate, tzid: masterStart?.tzid };

  setDateTime(clone, "RECURRENCE-ID", occurrenceIso, dtOpts);
  setDateTime(clone, "DTSTART", occurrenceIso, dtOpts);

  if (masterStart && masterEnd) {
    const durationMs =
      new Date(basicToIso(masterEnd.raw)).getTime() - new Date(basicToIso(masterStart.raw)).getTime();
    const occurrenceEndIso = new Date(new Date(occurrenceIso).getTime() + durationMs).toISOString();
    setDateTime(clone, "DTEND", occurrenceEndIso, { allDay: masterEnd.isDate, tzid: masterEnd.tzid });
  }

  return clone;
}

function summarizeVevent(vevent: ICalComponent): EventSummary {
  const recurrenceId = getDateTime(vevent, "RECURRENCE-ID");

  return {
    uid: getText(vevent, "UID") ?? "",
    title: getText(vevent, "SUMMARY") ?? "",
    description: getText(vevent, "DESCRIPTION"),
    location: getText(vevent, "LOCATION"),
    start: getDateTime(vevent, "DTSTART")?.raw ?? "",
    end: getDateTime(vevent, "DTEND")?.raw ?? "",
    occurrence: recurrenceId ? basicToIso(recurrenceId.raw) : undefined,
  };
}

// A single ReportEntry's calendar-data can contain more than one VEVENT:
// <c:expand> (report.ts's timeRangeQueryBody) returns a recurring master's
// matched occurrences as multiple VEVENT blocks inside ONE response's
// calendar-data, not as separate <d:response> entries per occurrence. Every
// VEVENT in the blob is a real, distinct occurrence that must be surfaced —
// callers (list.ts, free.ts) need all of them, not just the first.
export function extractEventSummaries(entry: ReportEntry): EventSummary[] {
  if (!entry.calendarData) return [];
  const cal = parseCalendar(entry.calendarData);
  return findAllComponents(cal, "VEVENT").map(summarizeVevent);
}
