import type { ICalComponent, ICalProperty } from "./parse.js";
import { escapeText, unescapeText, joinTextList, splitTextList } from "./escape.js";

// Shared VEVENT/VTODO field-level helpers. Protocol-ignorant like parse.ts —
// knows RFC 5545 value formats (TEXT, DATE, DATE-TIME) but nothing about
// dav-worker's own request schema (that mapping belongs to tools/schedule
// and tools/tasks, which call these).

export function newComponent(name: string): ICalComponent {
  return { name, properties: {}, components: [] };
}

// Depth-first search for the first sub-component with the given name —
// e.g. pulling the VEVENT or VTODO out of a parsed VCALENDAR.
export function findComponent(
  root: ICalComponent,
  name: string,
): ICalComponent | undefined {
  if (root.name === name) return root;
  for (const sub of root.components) {
    const found = findComponent(sub, name);
    if (found) return found;
  }
  return undefined;
}

export function getText(component: ICalComponent, name: string): string | undefined {
  const prop = component.properties[name]?.[0];
  return prop ? unescapeText(prop.value) : undefined;
}

// Replaces every existing occurrence of `name` with a single new value —
// correct for single-valued properties (SUMMARY, DESCRIPTION, STATUS, DUE...).
// For genuinely multi-valued properties (ATTENDEE) use addProperty instead.
export function setText(
  component: ICalComponent,
  name: string,
  value: string,
  params: Record<string, string> = {},
): void {
  component.properties[name] = [{ value: escapeText(value), params }];
}

export function removeProperty(component: ICalComponent, name: string): void {
  delete component.properties[name];
}

export function addProperty(
  component: ICalComponent,
  name: string,
  value: string,
  params: Record<string, string> = {},
): void {
  (component.properties[name] ??= []).push({ value, params });
}

export function getTextList(component: ICalComponent, name: string): string[] {
  const prop = component.properties[name]?.[0];
  return prop ? splitTextList(prop.value) : [];
}

export function setTextList(component: ICalComponent, name: string, items: string[]): void {
  if (items.length === 0) {
    removeProperty(component, name);
    return;
  }
  component.properties[name] = [{ value: joinTextList(items), params: {} }];
}

export interface ICalDateTime {
  raw: string;
  isDate: boolean;
  tzid?: string;
}

export function getDateTime(
  component: ICalComponent,
  name: string,
): ICalDateTime | undefined {
  const prop = component.properties[name]?.[0];
  if (!prop) return undefined;
  return {
    raw: prop.value,
    isDate: prop.params.VALUE === "DATE",
    tzid: prop.params.TZID,
  };
}

// Converts an ISO 8601 date ("2026-07-15") or date-time ("2026-07-15T10:00:00"
// or "...Z") into RFC 5545 basic format ("20260715" / "20260715T100000Z").
// A TZID param means the value is floating local time *in that zone* — the
// caller must supply an already zone-local ISO string in that case; no
// timezone conversion happens here, since that needs a full IANA tz
// database, which this Worker deliberately doesn't carry.
function isoToBasic(iso: string): string {
  const datePart = iso.slice(0, 10).replace(/-/g, "");
  if (iso.length <= 10) return datePart;

  const rest = iso.slice(11);
  const utc = rest.endsWith("Z");
  const timePart = (utc ? rest.slice(0, -1) : rest)
    .replace(/\.\d+$/, "") // drop fractional seconds
    .replace(/:/g, "");
  return `${datePart}T${timePart}${utc ? "Z" : ""}`;
}

export function setDateTime(
  component: ICalComponent,
  name: string,
  iso: string,
  opts: { allDay?: boolean; tzid?: string } = {},
): void {
  const params: Record<string, string> = {};
  if (opts.allDay) params.VALUE = "DATE";
  else if (opts.tzid) params.TZID = opts.tzid;
  component.properties[name] = [{ value: isoToBasic(iso), params }];
}

// Current instant as an RFC 5545 UTC DATE-TIME, for DTSTAMP/CREATED/
// LAST-MODIFIED.
export function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function withStamps(component: ICalComponent, uid: string): ICalComponent {
  setText(component, "UID", uid);
  const stamp = nowStamp();
  component.properties["DTSTAMP"] = [{ value: stamp, params: {} }];
  component.properties["CREATED"] = [{ value: stamp, params: {} }];
  return component;
}

export function newEvent(uid: string): ICalComponent {
  return withStamps(newComponent("VEVENT"), uid);
}

export function newTodo(uid: string): ICalComponent {
  return withStamps(newComponent("VTODO"), uid);
}

export function wrapInCalendar(component: ICalComponent): ICalComponent {
  const cal = newComponent("VCALENDAR");
  cal.properties["PRODID"] = [{ value: "-//dav-worker//EN", params: {} }];
  cal.properties["VERSION"] = [{ value: "2.0", params: {} }];
  cal.components.push(component);
  return cal;
}
