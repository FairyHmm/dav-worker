import { parse } from "@decimalturn/toml-patch";
import { isRecord, recordSection } from "./common";
import { parseLocations, type LocationsShape } from "./locations";
import { parseCalendars, type CalendarsShape } from "./calendars";
import { parseDisabled, type DisabledShape } from "./disabled";

// config/parser only extracts config.toml's sections into raw TOML shapes.
// Semantic validation is left to domain packages so they own their config.
export interface AppConfig {
  raw: RawAppConfig;
}

export interface RawAppConfig {
  preferences: Record<string, unknown>;
  locations: LocationsShape;
  calendars: CalendarsShape;
  disabled: DisabledShape;
}

// Canonical config sections — single source of truth for the sections the
// config_get/config_set tools accept and the config UI loads/edits.
// preferences is not surfaced in the UI yet but is planned to be.
export const CONFIG_SECTIONS = [
  "preferences",
  "locations",
  "calendars",
  "disabled",
] as const;
export type ConfigSection = (typeof CONFIG_SECTIONS)[number];
export type ConfigSections = Pick<RawAppConfig, ConfigSection>;

// Fresh zero-value sections. A factory rather than a constant so callers
// (e.g. reactive UI state) get a private copy they can mutate safely.
export function createEmptySections(): ConfigSections {
  return {
    preferences: {},
    locations: { aliases: {}, hosts: {}, patterns: {} },
    calendars: {},
    disabled: { categories: [], tools: {} },
  };
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
    disabled: parseDisabled(parsed.disabled),
  };

  return { raw: rawConfig };
}
