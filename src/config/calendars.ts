import { parse } from "smol-toml";
import CALENDARS_TOML from "./calendars.toml";

interface RawConfig {
  calendars?: Record<string, string>;
}

let cached: Record<string, string> | undefined;

function getCategoryMap(): Record<string, string> {
  if (!cached) {
    const raw = parse(CALENDARS_TOML) as RawConfig;
    cached = raw.calendars ?? {};
  }
  return cached;
}

export function resolveCalendarName(category: string): string {
  const map = getCategoryMap();
  const name = map[category];
  if (!name) {
    const known = Object.keys(map).join(", ");
    throw new Error(`Unknown category "${category}". Known categories: ${known}`);
  }
  return name;
}

export function allCalendarNames(): string[] {
  return Object.values(getCategoryMap());
}

export function allCategories(): string[] {
  return Object.keys(getCategoryMap());
}
