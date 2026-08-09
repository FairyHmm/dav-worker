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
  findAllComponents,
  cloneComponent,
  isoToBasic,
  basicToIso,
  setRRule,
  stampComponent,
} from "@dav-worker/calendar-ical";

// Maps dav-worker's field names onto RFC 5545 VEVENT properties. Kept out
// of ical/ itself, which knows RFC 5545, not this schema.

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
  // Present for an expanded occurrence of a recurring event; same shape
  // occurrence-targeted update/delete take, so it round-trips directly.
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

// Applies only fields present in `fields` (undefined = leave as-is).
export function applyEventFields(
  event: ICalComponent,
  fields: EventFields,
): void {
  if (fields.title !== undefined) setText(event, "SUMMARY", fields.title);
  if (fields.description !== undefined)
    setText(event, "DESCRIPTION", fields.description);
  if (fields.location !== undefined)
    setText(event, "LOCATION", fields.location);
  if (fields.start !== undefined) setDateTime(event, "DTSTART", fields.start);
  if (fields.end !== undefined) setDateTime(event, "DTEND", fields.end);

  stampComponent(event);
}

// `until`, if given, is ISO like the rest of dav-worker's schema —
// converted to RFC 5545 basic format here so callers stay ISO-only.
export interface RecurrenceFields {
  freq: "daily" | "weekly";
  interval?: number;
  until?: string;
}

export function applyRecurrence(
  event: ICalComponent,
  recurrence: RecurrenceFields,
): void {
  setRRule(event, {
    freq: recurrence.freq === "daily" ? "DAILY" : "WEEKLY",
    interval: recurrence.interval,
    until:
      recurrence.until !== undefined ? isoToBasic(recurrence.until) : undefined,
  });
}

// A plain event carrying X-DAV-WORKER-TRAVEL-FOR, pointing at the parent
// event's UID. Separate from buildEventComponent since buffers always need
// the linking property and never carry description/location.
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

// A VEVENT resource can hold a recurring master (no RECURRENCE-ID) plus
// zero or more detached overrides (RECURRENCE-ID set), sharing one UID.

export function findMasterEvent(
  events: ICalComponent[],
): ICalComponent | undefined {
  return events.find((e) => !e.properties["RECURRENCE-ID"]);
}

export function findOccurrenceOverride(
  events: ICalComponent[],
  occurrenceIso: string,
): ICalComponent | undefined {
  const basic = isoToBasic(occurrenceIso);
  return events.find(
    (e) => e.properties["RECURRENCE-ID"]?.[0]?.value === basic,
  );
}

// Clones a recurring master into a standalone override for one instance:
// RRULE/EXDATE stripped, DTSTART/DTEND shifted to the occurrence while
// preserving the master's duration. Caller applies field edits afterward.
// Idempotence is the caller's job — check findOccurrenceOverride() first.
export function detachOccurrence(
  master: ICalComponent,
  occurrenceIso: string,
): ICalComponent {
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
      new Date(basicToIso(masterEnd.raw)).getTime() -
      new Date(basicToIso(masterStart.raw)).getTime();
    const occurrenceEndIso = new Date(
      new Date(occurrenceIso).getTime() + durationMs,
    ).toISOString();
    setDateTime(clone, "DTEND", occurrenceEndIso, {
      allDay: masterEnd.isDate,
      tzid: masterEnd.tzid,
    });
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

// <c:expand> can return a recurring master's matched occurrences as
// multiple VEVENT blocks in one entry — every one is a distinct occurrence
// callers need, not just the first.
export function extractEventSummaries(entry: ReportEntry): EventSummary[] {
  if (!entry.calendarData) return [];
  const cal = parseCalendar(entry.calendarData);
  return findAllComponents(cal, "VEVENT").map(summarizeVevent);
}
