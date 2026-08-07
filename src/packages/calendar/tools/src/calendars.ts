// category is the interface tool calls use; slug is the CalDAV calendar
// name; color anchors task-list lookups. All three unique.
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

// Written verbatim to ic:calendar-color with no server-side validation;
// #RGB/#RRGGBB is all Nextcloud's own color picker emits.
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// [calendars] table shape (SPEC-CONFIG.md): category = [slug, color].
export type RawCalendarTable = Record<string, [string, string]>;

// Already TOML-parsed by the caller (config/parser) — no CSV parsing
// here anymore, per SPEC-CONFIG.md's single config.toml model.
function parseRows(raw: RawCalendarTable): CalendarRow[] {
  const categories = Object.keys(raw);

  return categories.map((category) => {
    const entry = raw[category];
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error(
        `[calendars] entry "${category}" must be a [slug, color] pair, got ${JSON.stringify(entry)}.`,
      );
    }
    const [slug, color] = entry;
    if (
      typeof slug !== "string" ||
      typeof color !== "string" ||
      !slug ||
      !color
    ) {
      throw new Error(
        `[calendars] entry "${category}" has an empty field (both slug and color are required): [${slug}, ${color}]`,
      );
    }
    if (!HEX_COLOR_RE.test(color)) {
      throw new Error(
        `[calendars] entry "${category}" has an invalid color "${color}" — expected a hex string ` +
          `like "#3B82F6" or "#3BF" (this value gets written directly to Nextcloud's ` +
          `calendar-color property).`,
      );
    }
    return { category, slug, color };
  });
}

export function parseCalendarConfig(raw: RawCalendarTable): CalendarConfig {
  const rows = parseRows(raw);

  const byCategory = new Map<string, CalendarRow>();
  const bySlug = new Map<string, CalendarRow>();
  const byColor = new Map<string, CalendarRow>();

  // Column-uniqueness guard, closed over the maps under construction.
  const claim = (
    map: Map<string, CalendarRow>,
    key: string,
    what: string,
    row: CalendarRow,
  ) => {
    if (map.has(key))
      throw new Error(`[calendars] has a duplicate ${what}: "${key}".`);
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
