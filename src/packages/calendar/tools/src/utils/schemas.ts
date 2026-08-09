import { z } from "zod";
import { allCategories, type CalendarConfig } from "../calendars.js";

// Built per-registration, not module-level: categories are per-session
// (deps.config), not build-time-bundled.
//
// Split into filter/write variants so a write path can't inherit
// list/free's "omit means all calendars" semantics by accident.
export function filterCategorySchema(config: CalendarConfig) {
  return z
    .string()
    .describe(
      `Calendar category. One of: ${allCategories(config).join(", ")}.`,
    );
}

export function writeCategorySchema(config: CalendarConfig) {
  return z
    .string()
    .describe(
      `Calendar category. One of: ${allCategories(config).join(", ")}.`,
    );
}

export const TitleSchema = z.string().describe("Event title.");

export const DescriptionSchema = z
  .string()
  .optional()
  .describe("Event description.");

export const LocationFieldSchema = z
  .string()
  .optional()
  .describe("Event location.");

export const DateTimeSchema = z
  .string()
  .describe(
    "ISO 8601 date-time, e.g. '2026-07-15T10:00:00' or '2026-07-15T10:00:00Z'.",
  );

export const TravelSchema = z
  .object({
    before: z
      .string()
      .optional()
      .describe("Buffer duration before the event, e.g. '20m'."),
    after: z
      .string()
      .optional()
      .describe("Buffer duration after the event, e.g. '15m'."),
  })
  .optional()
  .describe("Optional travel buffers before and/or after the event.");

export const RecurrenceSchema = z
  .object({
    freq: z.enum(["daily", "weekly"]).describe("Recurrence frequency."),
    interval: z
      .number()
      .optional()
      .describe(
        "Repeat every N periods (e.g. 2 = every other week). Default 1.",
      ),
    until: DateTimeSchema.optional().describe(
      "Last possible occurrence date/time, inclusive.",
    ),
  })
  .optional()
  .describe(
    "Optional recurrence. Daily/weekly only; no BYDAY patterns or COUNT.",
  );

export const IdSchema = z
  .string()
  .describe(
    "The event's CalDAV UID. Looked up across all configured calendars.",
  );

export const OccurrenceSchema = DateTimeSchema.optional().describe(
  "For recurring events: targets one instance instead of the whole series, " +
    "identified by its original ISO start. Omit to act on the whole series.",
);

// A malformed string here doesn't throw in resolveTimeWindow's `new Date(...)`
// Validating the shape here catches that before it can happen.
const YyyyMmDdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected 'YYYY-MM-DD'.");

export const TimeWindowSchema = z
  .union([
    z.object({ from: z.number(), to: z.number() }),
    z.object({ from: YyyyMmDdSchema, to: YyyyMmDdSchema }),
    z.enum(["today", "week", "month"]),
  ])
  .describe(
    "Time window: { from, to } as relative day-offsets from today (0 = today), " +
      "{ from, to } as absolute 'YYYY-MM-DD' dates, or a preset: 'today' | 'week' | 'month'.",
  );
