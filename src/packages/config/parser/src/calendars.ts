import { recordSection } from "./common";

// Per SPEC-CONFIG.md: category = [slug, color]. Color/uniqueness checks
// belong to calendar/tools, which owns semantic validation.
export type CalendarsShape = Record<string, [string, string]>;

export function parseCalendars(value: unknown): CalendarsShape {
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
