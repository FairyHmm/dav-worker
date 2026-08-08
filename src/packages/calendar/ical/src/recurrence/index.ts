import type { ICalComponent, ICalDateTime, ICalRecurrence } from "../types";
import { removeProperty } from "../tree/accessors";
import { isoToBasic } from "../tree/datetime";

const RRULE_KNOWN_KEYS = new Set([
  "FREQ",
  "INTERVAL",
  "UNTIL",
  "COUNT",
  "BYDAY",
]);

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

  if (!freq) return undefined;
  return {
    freq,
    interval,
    until,
    count,
    byday,
    extra: Object.keys(extra).length ? extra : undefined,
  };
}

export function setRRule(component: ICalComponent, rule: ICalRecurrence): void {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval !== undefined) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.until !== undefined) parts.push(`UNTIL=${rule.until}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.byday !== undefined && rule.byday.length > 0)
    parts.push(`BYDAY=${rule.byday.join(",")}`);
  if (rule.extra) {
    for (const key of Object.keys(rule.extra)) {
      if (RRULE_KNOWN_KEYS.has(key)) continue;
      parts.push(`${key}=${rule.extra[key]}`);
    }
  }
  component.properties["RRULE"] = [{ value: parts.join(";"), params: {} }];
}

export function removeRRule(component: ICalComponent): void {
  removeProperty(component, "RRULE");
}

// EXDATE commas separate dates outright (not TEXT-list commas), so no
// escaping is involved — just split on comma and parse each value.
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

// RFC 5545 requires VALUE type consistency within one EXDATE line —
// mixing allDay and timed exceptions needs separate calls.
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

// Simpler than setExdates for "drop this one occurrence" — just appends.
export function addExdate(
  component: ICalComponent,
  iso: string,
  opts: { allDay?: boolean; tzid?: string } = {},
): void {
  const existingRaw = getExdates(component).map((d) => d.raw);
  const basic = isoToBasic(iso);
  if (existingRaw.includes(basic)) return;

  const params: Record<string, string> = {};
  if (opts.allDay) params.VALUE = "DATE";
  else if (opts.tzid) params.TZID = opts.tzid;
  component.properties["EXDATE"] = [
    { value: [...existingRaw, basic].join(","), params },
  ];
}
