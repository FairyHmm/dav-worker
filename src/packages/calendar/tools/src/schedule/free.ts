import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { CalendarToolsDeps } from "../deps";
import { ok, err, defineTool } from "@dav-worker/mcp-utils";
import { z } from "zod";
import { filterCategorySchema, TimeWindowSchema } from "../utils/schemas";
import { resolveCalendarName, allCalendarNames } from "../calendars";
import {
  resolveTimeWindow,
  parseDurationMs,
  basicUtcToDate,
  dateToBasicUtc,
} from "@dav-worker/time-utils";
import { extractEventSummaries } from "../utils/mapping";
import type { Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

interface Interval {
  start: Date;
  end: Date;
}

// Merges/clamps busy intervals against the window, then walks the gaps
// between them (and before the first / after the last) looking for any gap
// >= minSlotMs. Intervals are assumed pre-sorted by start.
function findGaps(
  busy: Interval[],
  windowStart: Date,
  windowEnd: Date,
  minSlotMs: number,
): Interval[] {
  const merged: Interval[] = [];
  for (const b of busy) {
    const start = b.start < windowStart ? windowStart : b.start;
    const end = b.end > windowEnd ? windowEnd : b.end;
    if (end <= windowStart || start >= windowEnd || end <= start) continue;

    const last = merged[merged.length - 1];
    if (last && start <= last.end) {
      if (end > last.end) last.end = end;
    } else {
      merged.push({ start, end });
    }
  }

  const gaps: Interval[] = [];
  let cursor = windowStart;
  for (const b of merged) {
    if (b.start.getTime() - cursor.getTime() >= minSlotMs) {
      gaps.push({ start: cursor, end: b.start });
    }
    if (b.end.getTime() > cursor.getTime()) cursor = b.end;
  }
  if (windowEnd.getTime() - cursor.getTime() >= minSlotMs) {
    gaps.push({ start: cursor, end: windowEnd });
  }
  return gaps;
}

function createItemShape(deps: CalendarToolsDeps) {
  return {
    duration: z.string().describe("Minimum slot length, e.g. '1h', '30m'."),
    between: TimeWindowSchema,
    category: filterCategorySchema(deps.config).optional(),
  };
}

type FreeItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerScheduleFreeTool(
  server: McpServer,
  deps: CalendarToolsDeps,
  disabled: DisabledShape,
): void {
  defineTool(
    server,
    "calendar",
    disabled,
    "schedule_free",
    {
      description:
        "Find available time slots of at least `duration` within a window. " +
        "A slot must be free on every searched calendar to count.",
      annotations: {
        title: "Find Free Time",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(deps),
    },
    (item: FreeItem) => findFreeSlotsItem(deps, item),
  );
}

async function findFreeSlotsItem(deps: CalendarToolsDeps, item: FreeItem) {
  const { duration, between, category } = item;
  try {
    const minSlotMs = parseDurationMs(duration);
    const { startUtc, endUtc } = resolveTimeWindow(between);
    const windowStart = basicUtcToDate(startUtc);
    const windowEnd = basicUtcToDate(endUtc);

    const client = deps.storage;
    const calendarNames = category
      ? [resolveCalendarName(deps.config, category)]
      : allCalendarNames(deps.config);

    const busy: Interval[] = [];
    for (const calendarName of calendarNames) {
      const entries = await client.listByTimeRange(
        calendarName,
        "VEVENT",
        startUtc,
        endUtc,
      );
      for (const entry of entries) {
        for (const summary of extractEventSummaries(entry)) {
          if (!summary.start || !summary.end) continue;
          busy.push({
            start: basicUtcToDate(summary.start),
            end: basicUtcToDate(summary.end),
          });
        }
      }
    }
    busy.sort((a, b) => a.start.getTime() - b.start.getTime());

    const gaps = findGaps(busy, windowStart, windowEnd, minSlotMs);

    if (gaps.length === 0) {
      return ok("No available slots of that length in this window.");
    }

    const lines = gaps.map(
      (g) => `${dateToBasicUtc(g.start)} \u2013 ${dateToBasicUtc(g.end)}`,
    );
    return ok(lines.join("\n"));
  } catch (e) {
    return err(e);
  }
}
