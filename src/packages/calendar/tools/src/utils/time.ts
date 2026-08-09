// All arithmetic is UTC calendar days — no local-timezone reasoning,
// no IANA tz database (see ical/component.ts).

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

// Calendar-boundary windows ("week" = Mon–Sun containing today, "month" =
// 1st–last of current month), distinct from the rolling { from, to }
// numeric-offset shape (e.g. { from: 0, to: 7 } = "next 7 days").
function startOfWeek(d: Date): Date {
  // getUTCDay(): 0=Sun..6=Sat. Shift so Monday is the start.
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(d, diff);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfNextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function toBasicUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

// Turns REPORT-window boundaries and event start/end (basic UTC strings)
// into Dates for gap arithmetic, and back.
export const dateToBasicUtc = toBasicUtc;

export function basicUtcToDate(basic: string): Date {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(basic);
  if (!m) {
    throw new Error(
      `Cannot parse date-time value "${basic}" as RFC 5545 basic UTC.`,
    );
  }
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

// Parses a duration like "1h", "30m", or "1h30m" into milliseconds.
export function parseDurationMs(duration: string): number {
  const match = /^(?:(\d+)h)?(?:(\d+)m)?$/.exec(duration.trim());
  if (!match || (!match[1] && !match[2])) {
    throw new Error(
      `Invalid duration "${duration}". Expected e.g. "1h", "30m", or "1h30m".`,
    );
  }
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return (hours * 60 + minutes) * 60_000;
}

// Shifts an ISO date-time by `ms`, for travel-buffer start/end math.
// Round-trips through Date, so output is always UTC "Z" even when the
// input was floating local — fine for pure relative-offset arithmetic
// (no IANA tz database here, see ical/component.ts).
export function shiftIso(iso: string, ms: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Cannot parse date-time value "${iso}".`);
  }
  return new Date(d.getTime() + ms).toISOString();
}

export type TimeWindowInput =
  | { from: number; to: number }
  | { from: string; to: string }
  | "today"
  | "week"
  | "month";

export function resolveTimeWindow(time: TimeWindowInput): {
  startUtc: string;
  endUtc: string;
} {
  const today = startOfUtcDay(new Date());

  if (typeof time === "string") {
    switch (time) {
      case "today":
        return {
          startUtc: toBasicUtc(today),
          endUtc: toBasicUtc(addDays(today, 1)),
        };
      case "week": {
        const start = startOfWeek(today);
        return {
          startUtc: toBasicUtc(start),
          endUtc: toBasicUtc(addDays(start, 7)),
        };
      }
      case "month": {
        const start = startOfMonth(today);
        return {
          startUtc: toBasicUtc(start),
          endUtc: toBasicUtc(startOfNextMonth(today)),
        };
      }
      default: {
        const known = "today, week, month";
        throw new Error(
          `Unknown time preset "${time}". Known presets: ${known}`,
        );
      }
    }
  }

  const { from, to } = time;
  if (typeof from === "number" && typeof to === "number") {
    return {
      startUtc: toBasicUtc(addDays(today, from)),
      endUtc: toBasicUtc(addDays(today, to)),
    };
  }
  if (typeof from === "string" && typeof to === "string") {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    // Regex-shaped doesn't mean calendar-valid (e.g. "2026-02-30") — Date
    // rolls those over silently instead of throwing, so check explicitly
    // rather than let a bad window reach the REPORT query as "NaNNaN...".
    if (Number.isNaN(fromDate.getTime())) {
      throw new Error(`Cannot parse date value "${from}" as 'YYYY-MM-DD'.`);
    }
    if (Number.isNaN(toDate.getTime())) {
      throw new Error(`Cannot parse date value "${to}" as 'YYYY-MM-DD'.`);
    }
    return {
      startUtc: toBasicUtc(fromDate),
      endUtc: toBasicUtc(toDate),
    };
  }

  throw new Error(
    "time.from/time.to must both be numbers (relative day-offsets) or both be 'YYYY-MM-DD' strings (absolute).",
  );
}
