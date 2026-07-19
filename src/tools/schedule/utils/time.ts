// Resolves nc_schedule_*'s three time-window shapes (relative day-offsets,
// absolute dates, or a named preset) into RFC 5545 UTC basic-format
// start/end strings for CalDAV time-range REPORT queries. All arithmetic is
// done in UTC calendar days — no local-timezone reasoning, consistent with
// ical/component.ts's decision not to carry an IANA tz database.

const PRESET_WINDOWS: Record<string, { from: number; to: number }> = {
  today: { from: 0, to: 1 },
  week: { from: 0, to: 7 },
  month: { from: 0, to: 30 },
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function toBasicUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

export type TimeWindowInput =
  | { from: number; to: number }
  | { from: string; to: string }
  | keyof typeof PRESET_WINDOWS;

export function resolveTimeWindow(
  time: TimeWindowInput,
): { startUtc: string; endUtc: string } {
  const today = startOfUtcDay(new Date());

  if (typeof time === "string") {
    const preset = PRESET_WINDOWS[time];
    if (!preset) {
      const known = Object.keys(PRESET_WINDOWS).join(", ");
      throw new Error(`Unknown time preset "${time}". Known presets: ${known}`);
    }
    return {
      startUtc: toBasicUtc(addDays(today, preset.from)),
      endUtc: toBasicUtc(addDays(today, preset.to)),
    };
  }

  const { from, to } = time;
  if (typeof from === "number" && typeof to === "number") {
    return {
      startUtc: toBasicUtc(addDays(today, from)),
      endUtc: toBasicUtc(addDays(today, to)),
    };
  }
  if (typeof from === "string" && typeof to === "string") {
    return {
      startUtc: toBasicUtc(new Date(`${from}T00:00:00Z`)),
      endUtc: toBasicUtc(new Date(`${to}T00:00:00Z`)),
    };
  }

  throw new Error(
    "time.from/time.to must both be numbers (relative day-offsets) or both be 'YYYY-MM-DD' strings (absolute).",
  );
}
