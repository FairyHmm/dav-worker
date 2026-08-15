import { parse } from "@decimalturn/toml-patch";

// config/parser only extracts config.toml's sections into raw TOML shapes.
// Semantic validation is left to domain packages so they own their config.
export interface AppConfig {
  raw: RawAppConfig;
}

// Not exported so each domain package can define its own validated shape.
interface LocationsShape {
  aliases: Record<string, string>;
  hosts: Record<string, string[]>;
  patterns: Record<string, string>;
}

// Per SPEC-CONFIG.md: category = [slug, color]. Color/uniqueness checks
// belong to calendar/tools, which owns semantic validation.
type CalendarsShape = Record<string, [string, string]>;

export interface RawAppConfig {
  preferences: Record<string, unknown>;
  locations: LocationsShape;
  calendars: CalendarsShape;
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

function parseLocations(value: unknown): LocationsShape {
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

function parseCalendars(value: unknown): CalendarsShape {
  const table = recordSection(value, "calendars");
  const calendars: CalendarsShape = {};
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

// An empty or missing config.toml is a valid zero-value, not an error.
export function parseAppConfig(raw: string): AppConfig {
  const parsed = raw.trim() ? parse(raw) : {};
  if (!isRecord(parsed))
    throw new Error("config.toml must contain TOML tables.");
  const rawConfig: RawAppConfig = {
    preferences: recordSection(parsed.preferences, "preferences"),
    locations: parseLocations(parsed.locations),
    calendars: parseCalendars(parsed.calendars),
  };

  return { raw: rawConfig };
}
