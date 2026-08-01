// Category/slug/color map for calendars.csv. Replaces the old
// calendars.toml's two-table shape ([calendars] category->slug,
// [colors] category->color) with one CSV, one row per calendar, all three
// columns required and mutually unique — category is the primary interface
// tool calls use, slug is the CalDAV calendar name for calendar queries,
// color is the task-list anchor for task tools.
//
// Parsing builds three indexed lookup maps (by category, by slug, by
// color) rather than returning the raw row array, so every lookup
// direction is O(1) and callers never re-scan rows themselves.
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

// Enforced at parse time, not left to the CalDAV round-trip: `color` gets
// written verbatim into ic:calendar-color on the live collection
// (tasks.ts listCreate) with no server-side validation of its shape, so a
// malformed value here would otherwise persist silently and only surface
// later as a list_all color filter that never matches anything. #RGB and
// #RRGGBB are both valid CSS/iCal hex forms; that's all Nextcloud's own
// color picker emits, so that's all this accepts.
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Hand-rolled: the format has no quoted/escaped fields to worry about
// (category, slug, and hex color are all plain unquoted tokens), so a real
// CSV parser would be one more dependency for nothing it actually buys us.
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

  // Same guard repeated for each of the row's three mutually-unique
  // columns — a closure over the maps-under-construction, not lifted out
  // to resolveRow above, since that helper is about *reading* a finished
  // CalendarConfig and this is about *building* one row at a time.
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

// Shared shape behind resolveCalendarName/resolveCategoryColor/
// resolveCategoryByColor below: look a key up in one of CalendarConfig's
// three maps, or throw with the map's own key set as the "known values"
// list. `what` only feeds the error message — the three call sites differ
// solely in which map and label they pass in.
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
