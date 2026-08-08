import type { ICalComponent, ICalDateTime } from "../types";
import {
  escapeText,
  unescapeText,
  joinTextList,
  splitTextList,
} from "./escape";
import { isoToBasic } from "./datetime";

export function getText(
  component: ICalComponent,
  name: string,
): string | undefined {
  const prop = component.properties[name]?.[0];
  return prop ? unescapeText(prop.value) : undefined;
}

// Replaces every existing occurrence with a single new value — correct for
// single-valued properties (SUMMARY, DESCRIPTION, STATUS, DUE...).
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

export function setTextList(
  component: ICalComponent,
  name: string,
  items: string[],
): void {
  if (items.length === 0) {
    removeProperty(component, name);
    return;
  }
  component.properties[name] = [{ value: joinTextList(items), params: {} }];
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
