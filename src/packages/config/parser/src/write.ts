import { patch, parse } from "@decimalturn/toml-patch";
import { isRecord } from "./common";

// Generic, section-agnostic write path used by config_set for any of
// preferences/locations/calendars/disabled
export function writeSection(
  existing: string,
  section: string,
  value: unknown,
): string {
  const base = existing.trim() ? parse(existing) : {};
  if (!isRecord(base)) throw new Error("config.toml must contain TOML tables.");
  const updated = { ...base, [section]: value };
  return patch(existing, updated);
}
