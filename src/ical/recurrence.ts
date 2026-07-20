import type { ICalComponent } from "./parse.js";
import { removeProperty, isoToBasic, type ICalDateTime } from "./component.js";

// RRULE/EXDATE (RFC 5545 §3.8.5) helpers — split out of component.ts since
// this pair has its own cohesive doc/shape and was growing that file past
// its "general field helpers" scope. Still protocol-ignorant like the rest
// of ical/: knows RFC 5545 value formats, not dav-worker's request schema.

// RRULE is a structured value — semicolon-separated KEY=VALUE pairs, e.g.
// "FREQ=WEEKLY;INTERVAL=2;UNTIL=20260101T000000Z" — not a plain TEXT
// field, so it gets its own get/set rather than reusing getText/setText.
// Preserves whatever parts are present (COUNT, BYDAY, etc.) even though
// dav-worker's v1 schedule schema only exposes freq/interval/until — that
// restriction belongs to tools/schedule's mapping, not here.
export interface ICalRecurrence {
  freq: string;
  interval?: number;
  until?: string; // RFC 5545 basic DATE or DATE-TIME
  count?: number;
  byday?: string[];
  // Any other RRULE parts (BYMONTH, BYSETPOS, WKST, ...) round-trip through
  // here untouched even though nothing else in this codebase reads them yet.
  extra?: Record<string, string>;
}

const RRULE_KNOWN_KEYS = new Set(["FREQ", "INTERVAL", "UNTIL", "COUNT", "BYDAY"]);

export function getRRule(component: ICalComponent): ICalRecurrence | undefined {
  const prop = component.properties["RRULE"]?.[0];
  if (!prop) return undefined;

  const extra: Record<string, string> = {};
  let freq: string | undefined;
  let interval: number | undefined;
  let until: string | undefined;
  let count: number | undefined;
  let byday: string[] | undefined;

  for (const part of prop.value.split(";")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).toUpperCase();
    const val = part.slice(eq + 1);
    switch (key) {
      case "FREQ":
        freq = val;
        break;
      case "INTERVAL":
        interval = Number(val);
        break;
      case "UNTIL":
        until = val;
        break;
      case "COUNT":
        count = Number(val);
        break;
      case "BYDAY":
        byday = val.split(",");
        break;
      default:
        extra[key] = val;
        break;
    }
  }

  if (!freq) return undefined; // malformed RRULE with no FREQ — treat as absent
  return { freq, interval, until, count, byday, extra: Object.keys(extra).length ? extra : undefined };
}

export function setRRule(component: ICalComponent, rule: ICalRecurrence): void {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval !== undefined) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.until !== undefined) parts.push(`UNTIL=${rule.until}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.byday !== undefined && rule.byday.length > 0) parts.push(`BYDAY=${rule.byday.join(",")}`);
  if (rule.extra) {
    for (const key of Object.keys(rule.extra)) {
      if (RRULE_KNOWN_KEYS.has(key)) continue; // don't double-emit a known key stashed in extra by mistake
      parts.push(`${key}=${rule.extra[key]}`);
    }
  }
  component.properties["RRULE"] = [{ value: parts.join(";"), params: {} }];
}

export function removeRRule(component: ICalComponent): void {
  removeProperty(component, "RRULE");
}

// EXDATE is a DATE-TIME-list value — one or more comma-separated
// dates/date-times, optionally split across multiple EXDATE lines (each
// possibly with its own VALUE=DATE/TZID params). Not TEXT, so
// getTextList/setTextList (which unescape TEXT-list commas) don't apply —
// commas here separate dates outright, no escaping involved.
export function getExdates(component: ICalComponent): ICalDateTime[] {
  const props = component.properties["EXDATE"];
  if (!props) return [];
  const out: ICalDateTime[] = [];
  for (const prop of props) {
    const isDate = prop.params.VALUE === "DATE";
    const tzid = prop.params.TZID;
    for (const raw of prop.value.split(",")) {
      if (raw) out.push({ raw, isDate, tzid });
    }
  }
  return out;
}

// Replaces all EXDATE lines with a single one listing every skipped
// occurrence. `iso` values are converted the same way setDateTime does;
// mixing allDay and timed exceptions in one call isn't supported since
// RFC 5545 requires VALUE type consistency within one EXDATE line — call
// this per-batch if a mix is ever needed.
export function setExdates(
  component: ICalComponent,
  isos: string[],
  opts: { allDay?: boolean; tzid?: string } = {},
): void {
  if (isos.length === 0) {
    removeProperty(component, "EXDATE");
    return;
  }
  const params: Record<string, string> = {};
  if (opts.allDay) params.VALUE = "DATE";
  else if (opts.tzid) params.TZID = opts.tzid;
  const values = isos.map(isoToBasic);
  component.properties["EXDATE"] = [{ value: values.join(","), params }];
}

// Appends one more skip date to whatever EXDATE already exists, preserving
// existing params if compatible. Simpler call site for "drop this one
// occurrence" than reconstructing the full list via setExdates.
export function addExdate(
  component: ICalComponent,
  iso: string,
  opts: { allDay?: boolean; tzid?: string } = {},
): void {
  const existingRaw = getExdates(component).map((d) => d.raw);
  const basic = isoToBasic(iso);
  if (existingRaw.includes(basic)) return; // already skipped, no-op

  const params: Record<string, string> = {};
  if (opts.allDay) params.VALUE = "DATE";
  else if (opts.tzid) params.TZID = opts.tzid;
  component.properties["EXDATE"] = [{ value: [...existingRaw, basic].join(","), params }];
}
