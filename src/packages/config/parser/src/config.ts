import { parse } from "smol-toml";
import {
  buildFilesConfig,
  type FilesConfig,
  type RawConfig as RawLocationsSection,
} from "@dav-worker/files-locations";
import {
  parseCalendarConfig,
  type CalendarConfig,
  type RawCalendarTable,
} from "@dav-worker/calendar-tools";

// Single fetch+parse point per SPEC-CONFIG.md's one-file model; both
// app/worker and app/local call this once per session/request.
export interface AppConfig {
  // Kept in config.toml's own shape so config_get/config_set can
  // round-trip a section without reconstructing it from parsed form.
  raw: RawAppConfig;
  locations: FilesConfig;
  calendars: CalendarConfig;
  // No fixed shape yet — passed through unparsed until a tool consumes it.
  preferences: Record<string, unknown>;
}

export interface RawAppConfig {
  preferences: Record<string, unknown>;
  locations: RawLocationsSection;
  calendars: RawCalendarTable;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordSection(
  value: unknown,
  section: string,
): Record<string, unknown> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`[${section}] must be a table.`);
  return value;
}

function stringTable(value: unknown, section: string): Record<string, string> {
  const table = recordSection(value, section);
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(table)) {
    if (typeof entry !== "string")
      throw new Error(`[${section}] entry "${key}" must be a string.`);
    result[key] = entry;
  }
  return result;
}

function parseLocations(value: unknown): RawLocationsSection {
  const table = recordSection(value, "locations");
  const hostsTable = recordSection(table.hosts, "locations.hosts");
  const hosts: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(hostsTable)) {
    if (
      !Array.isArray(entry) ||
      entry.some((name) => typeof name !== "string")
    ) {
      throw new Error(
        `[locations.hosts] entry "${key}" must be an array of strings.`,
      );
    }
    hosts[key] = [...entry];
  }
  return {
    aliases: stringTable(table.aliases, "locations.aliases"),
    hosts,
    patterns: stringTable(table.patterns, "locations.patterns"),
  };
}

function parseCalendars(value: unknown): RawCalendarTable {
  const table = recordSection(value, "calendars");
  const calendars: RawCalendarTable = {};
  for (const [category, entry] of Object.entries(table)) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      typeof entry[1] !== "string"
    ) {
      throw new Error(
        `[calendars] entry "${category}" must be a [slug, color] pair of strings.`,
      );
    }
    calendars[category] = [entry[0], entry[1]];
  }
  return calendars;
}

// Empty/missing config.toml parses to each section's zero-value, not a throw.
export function parseAppConfig(raw: string): AppConfig {
  const parsed = raw.trim() ? parse(raw) : {};
  if (!isRecord(parsed))
    throw new Error("config.toml must contain TOML tables.");
  const rawConfig: RawAppConfig = {
    preferences: recordSection(parsed.preferences, "preferences"),
    locations: parseLocations(parsed.locations),
    calendars: parseCalendars(parsed.calendars),
  };

  return {
    raw: rawConfig,
    locations: buildFilesConfig(rawConfig.locations),
    calendars: parseCalendarConfig(rawConfig.calendars),
    preferences: rawConfig.preferences,
  };
}
