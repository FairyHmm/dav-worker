import { z } from "zod";
import { allCategories, type CalendarConfig } from "../calendars.js";

// A function, not a module-level constant (TODO-MONOREPO 9e): the category
// list used to come from a build-time-bundled calendars.toml, so this
// schema could be built once at module load. Categories are now per-session
// (fetched at request time — see createServer), so each tool builds its
// own copy of this schema from deps.config when it registers, same request
// scope as everything else touching CalendarConfig.
export function categorySchema(config: CalendarConfig) {
  return z.string().describe(`Calendar category. One of: ${allCategories(config).join(", ")}.`);
}

export const TitleSchema = z.string().describe("Event title.");

export const DescriptionSchema = z.string().optional().describe("Event description.");

export const LocationFieldSchema = z.string().optional().describe("Event location.");

export const DateTimeSchema = z
  .string()
  .describe(
    "ISO 8601 date-time, e.g. '2026-07-15T10:00:00' (floating local time) " +
      "or '2026-07-15T10:00:00Z' (UTC). No IANA timezone-name conversion is " +
      "performed — pass an already zone-local value if that's what you mean.",
  );

export const TravelSchema = z
  .object({
    before: z.string().optional().describe("Buffer duration before the event, e.g. '20m'."),
    after: z.string().optional().describe("Buffer duration after the event, e.g. '15m'."),
  })
  .optional()
  .describe(
    "Optional travel buffers, created as separate linked VEVENTs in the " +
      "same calendar (tagged X-DAV-WORKER-TRAVEL-FOR) rather than folded " +
      "into the event itself.",
  );

export const RecurrenceSchema = z
  .object({
    freq: z.enum(["daily", "weekly"]).describe("Recurrence frequency."),
    interval: z
      .number()
      .optional()
      .describe("Repeat every N periods (e.g. 2 = every other week). Default 1."),
    until: DateTimeSchema.optional().describe("Last possible occurrence date/time, inclusive."),
  })
  .optional()
  .describe(
    "Optional recurrence, assembled into an RRULE server-side. Friendlier " +
      "schema, not raw RRULE input — only daily/weekly with an interval " +
      "and/or end date is supported in v1, no BYDAY patterns or COUNT.",
  );

export const IdSchema = z
  .string()
  .describe(
    "The event's CalDAV UID, as returned by nc_schedule_list/nc_schedule_create.",
  );

export const OccurrenceSchema = DateTimeSchema.optional().describe(
  "For recurring events: targets one instance instead of the whole series, " +
    "identified by its original ISO start (the `occurrence` field returned " +
    "by nc_schedule_list for expanded recurring events). Omit to act on " +
    "the whole series.",
);

export const TimeWindowSchema = z
  .union([
    z.object({ from: z.number(), to: z.number() }),
    z.object({ from: z.string(), to: z.string() }),
    z.enum(["today", "week", "month"]),
  ])
  .describe(
    "Time window: { from, to } as relative day-offsets from today (0 = today), " +
      "{ from, to } as absolute 'YYYY-MM-DD' dates, or a preset: 'today' | 'week' | 'month'.",
  );
