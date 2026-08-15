import { parse } from "@decimalturn/toml-patch";
import { isRecord, recordSection } from "./common";
import { parseLocations, type LocationsShape } from "./locations";
import { parseCalendars, type CalendarsShape } from "./calendars";

// config/parser only extracts config.toml's sections into raw TOML shapes.
// Semantic validation is left to domain packages so they own their config.
export interface AppConfig {
  raw: RawAppConfig;
}

export interface RawAppConfig {
  preferences: Record<string, unknown>;
  locations: LocationsShape;
  calendars: CalendarsShape;
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
