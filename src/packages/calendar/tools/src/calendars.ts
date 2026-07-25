import { parse } from "smol-toml";

// Category -> calendar-name map (see calendars.toml). No longer bundled at
// build time or cached at module level (TODO-MONOREPO 9e) — the raw TOML
// is fetched per-session from the user's configured Nextcloud path
// (SPEC-MONOREPO.md's Session Config) and parsed here. `createServer`
// resolves this once per request and passes the map down via
// CalendarToolsDeps.config, which is the "per-request cache" the spec
// asks for; every function below is now a pure lookup over that map.
export type CalendarConfig = Record<string, string>;

interface RawConfig {
  calendars?: Record<string, string>;
}

export function parseCalendarConfig(raw: string): CalendarConfig {
  const rawConfig = parse(raw) as RawConfig;
  return rawConfig.calendars ?? {};
}

export function resolveCalendarName(config: CalendarConfig, category: string): string {
  const name = config[category];
  if (!name) {
    const known = Object.keys(config).join(", ");
    throw new Error(`Unknown category "${category}". Known categories: ${known}`);
  }
  return name;
}

export function allCalendarNames(config: CalendarConfig): string[] {
  return Object.values(config);
}

export function allCategories(config: CalendarConfig): string[] {
  return Object.keys(config);
}
