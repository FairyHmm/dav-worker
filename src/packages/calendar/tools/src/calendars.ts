// One row per calendar: category is the interface tool calls use, slug is
// the CalDAV calendar name, color is the task-list anchor for task tools.
// All three required and mutually unique.
export interface CalendarRow {
  category: string;
  slug: string;
  color: string;
}

export interface CalendarConfig {
  byCategory: Map<string, CalendarRow>;
  bySlug: Map<string, CalendarRow>;
  byColor: Map<string, CalendarRow>;
}

const EXPECTED_HEADER = ["category", "slug", "color"];

// Written verbatim into ic:calendar-color with no server-side validation,
// so a malformed value would otherwise persist silently and only surface
// later as a color filter that never matches. #RGB/#RRGGBB is all
// Nextcloud's own color picker emits.
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Hand-rolled: no quoted/escaped fields to worry about, so a real CSV
// parser buys nothing here.
function parseRows(raw: string): CalendarRow[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error(
      "calendars.csv is empty (expected a header row plus at least one calendar).",
    );
  }

  const header = lines[0]!.split(",").map((cell) => cell.trim());
  if (
    header.length !== EXPECTED_HEADER.length ||
    EXPECTED_HEADER.some((col, i) => header[i] !== col)
  ) {
    throw new Error(
      `calendars.csv header must be exactly "${EXPECTED_HEADER.join(",")}", got "${header.join(",")}".`,
    );
  }

  return lines.slice(1).map((line, i) => {
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length !== EXPECTED_HEADER.length) {
      throw new Error(
        `calendars.csv row ${i + 2} has ${cells.length} fields, expected ${EXPECTED_HEADER.length}: "${line}"`,
      );
    }
    const [category, slug, color] = cells as [string, string, string];
    if (!category || !slug || !color) {
      throw new Error(
        `calendars.csv row ${i + 2} has an empty field (all of category, slug, color are required): "${line}"`,
      );
    }
    if (!HEX_COLOR_RE.test(color)) {
      throw new Error(
        `calendars.csv row ${i + 2} has an invalid color "${color}" — expected a hex string ` +
          `like "#3B82F6" or "#3BF" (this value gets written directly to Nextcloud's ` +
          `calendar-color property): "${line}"`,
      );
    }
    return { category, slug, color };
  });
}

export function parseCalendarConfig(raw: string): CalendarConfig {
  const rows = parseRows(raw);

  const byCategory = new Map<string, CalendarRow>();
  const bySlug = new Map<string, CalendarRow>();
  const byColor = new Map<string, CalendarRow>();

  // One column-uniqueness guard, closed over the maps under construction
  // (building, not the read-side resolveRow below).
  const claim = (
    map: Map<string, CalendarRow>,
    key: string,
    what: string,
    row: CalendarRow,
  ) => {
    if (map.has(key))
      throw new Error(`calendars.csv has a duplicate ${what}: "${key}".`);
    map.set(key, row);
  };

  for (const row of rows) {
    claim(byCategory, row.category, "category", row);
    claim(bySlug, row.slug, "slug", row);
    claim(byColor, row.color, "color", row);
  }

  return { byCategory, bySlug, byColor };
}

// Backs resolveCalendarName/resolveCategoryColor/resolveCategoryByColor —
// look up a key or throw with the map's own keys as "known values".
function resolveRow<K extends string>(
  map: Map<K, CalendarRow>,
  key: K,
  what: string,
): CalendarRow {
  const row = map.get(key);
  if (!row) {
    const known = Array.from(map.keys()).join(", ");
    throw new Error(`Unknown ${what} "${key}". Known ${what}s: ${known}`);
  }
  return row;
}

export function resolveCalendarName(
  config: CalendarConfig,
  category: string,
): string {
  return resolveRow(config.byCategory, category, "category").slug;
}

export function resolveCategoryColor(
  config: CalendarConfig,
  category: string,
): string {
  return resolveRow(config.byCategory, category, "category").color;
}

export function resolveCategoryByColor(
  config: CalendarConfig,
  color: string,
): string {
  return resolveRow(config.byColor, color, "color").category;
}

export function allCalendarNames(config: CalendarConfig): string[] {
  return Array.from(config.bySlug.keys());
}

export function allCategories(config: CalendarConfig): string[] {
  return Array.from(config.byCategory.keys());
}
