// Deliberately duplicated from calendar/tools' time.ts — see
// SPEC-MONOREPO.md A.7.

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function startOfWeek(d: Date): Date {
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
    return {
      startUtc: toBasicUtc(new Date(`${from}T00:00:00Z`)),
      endUtc: toBasicUtc(new Date(`${to}T00:00:00Z`)),
    };
  }

  throw new Error(
    "due.from/due.to must both be numbers (relative day-offsets) or both be 'YYYY-MM-DD' strings (absolute).",
  );
}
