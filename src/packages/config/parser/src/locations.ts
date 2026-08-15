import { recordSection, stringTable } from "./common";

// Internal to this package so files/locations owns its validated shape.
export interface LocationsShape {
  aliases: Record<string, string>;
  hosts: Record<string, string[]>;
  patterns: Record<string, string>;
}

export function parseLocations(value: unknown): LocationsShape {
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
