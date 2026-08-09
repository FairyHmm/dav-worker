import { describe, it, expect } from "vitest";
import {
  toBasicUtc,
  dateToBasicUtc,
  basicUtcToDate,
  parseDurationMs,
  shiftIso,
  resolveTimeWindow,
} from "./index";

describe("toBasicUtc", () => {
  it("converts Date to RFC 5545 basic UTC", () => {
    expect(toBasicUtc(new Date("2026-03-15T08:30:00.000Z"))).toBe(
      "20260315T083000Z",
    );
  });

  it("strips fractional seconds", () => {
    expect(toBasicUtc(new Date("2026-01-01T00:00:00.123Z"))).toBe(
      "20260101T000000Z",
    );
  });

  it("works for midnight", () => {
    expect(toBasicUtc(new Date("2026-12-31T00:00:00.000Z"))).toBe(
      "20261231T000000Z",
    );
  });
});

describe("dateToBasicUtc", () => {
  it("is an alias of toBasicUtc", () => {
    const d = new Date("2026-06-15T12:00:00.000Z");
    expect(dateToBasicUtc(d)).toBe(toBasicUtc(d));
  });
});

describe("basicUtcToDate", () => {
  it("parses basic UTC to Date", () => {
    const d = basicUtcToDate("20260115T093000Z");
    expect(d.toISOString()).toBe("2026-01-15T09:30:00.000Z");
  });

  it("handles missing trailing Z", () => {
    const d = basicUtcToDate("20260115T093000");
    expect(d.toISOString()).toBe("2026-01-15T09:30:00.000Z");
  });

  it("round-trips with toBasicUtc", () => {
    const original = new Date("2026-07-04T18:00:00.000Z");
    expect(basicUtcToDate(toBasicUtc(original))).toEqual(original);
  });

  it("throws on invalid format", () => {
    expect(() => basicUtcToDate("not-a-date")).toThrow(
      "Cannot parse date-time value",
    );
  });
});

describe("parseDurationMs", () => {
  it("parses hours", () => {
    expect(parseDurationMs("1h")).toBe(3_600_000);
  });

  it("parses minutes", () => {
    expect(parseDurationMs("30m")).toBe(1_800_000);
  });

  it("parses hours and minutes", () => {
    expect(parseDurationMs("1h30m")).toBe(5_400_000);
  });

  it("parses zero", () => {
    expect(parseDurationMs("0h0m")).toBe(0);
  });

  it("trims whitespace", () => {
    expect(parseDurationMs(" 2h ")).toBe(7_200_000);
  });

  it("throws on invalid input", () => {
    expect(() => parseDurationMs("xyz")).toThrow("Invalid duration");
  });

  it("throws on empty string", () => {
    expect(() => parseDurationMs("")).toThrow("Invalid duration");
  });
});

describe("shiftIso", () => {
  it("adds milliseconds", () => {
    expect(shiftIso("2026-01-15T09:00:00Z", 3_600_000)).toBe(
      "2026-01-15T10:00:00.000Z",
    );
  });

  it("handles negative offset", () => {
    expect(shiftIso("2026-01-15T09:00:00Z", -3_600_000)).toBe(
      "2026-01-15T08:00:00.000Z",
    );
  });

  it("throws on invalid ISO string", () => {
    expect(() => shiftIso("not-a-date", 1000)).toThrow(
      "Cannot parse date-time value",
    );
  });
});

describe("resolveTimeWindow", () => {
  it("resolves 'today'", () => {
    const { startUtc, endUtc } = resolveTimeWindow("today");
    expect(startUtc).toMatch(/^\d{8}T000000Z$/);
    expect(endUtc).toMatch(/^\d{8}T000000Z$/);
    expect(startUtc < endUtc).toBe(true);
  });

  it("resolves 'week' with Monday start", () => {
    const { startUtc } = resolveTimeWindow("week");
    // start should be a Monday (day 1 of ISO week)
    const d = basicUtcToDate(startUtc);
    expect(d.getUTCDay()).toBe(1);
  });

  it("resolves 'month'", () => {
    const { startUtc } = resolveTimeWindow("month");
    expect(startUtc).toMatch(/^\d{6}01T000000Z$/);
  });

  it("resolves numeric offsets", () => {
    const { startUtc, endUtc } = resolveTimeWindow({ from: 0, to: 7 });
    expect(startUtc < endUtc).toBe(true);
  });

  it("resolves string dates", () => {
    const { startUtc, endUtc } = resolveTimeWindow({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(startUtc).toBe("20260101T000000Z");
    expect(endUtc).toBe("20260131T000000Z");
  });

  it("throws on unknown preset", () => {
    expect(() => resolveTimeWindow("unknown" as any)).toThrow(
      'Unknown time preset "unknown"',
    );
  });

  it("throws on mixed types", () => {
    expect(() =>
      resolveTimeWindow({ from: 0, to: "2026-01-01" } as any),
    ).toThrow("must both be numbers");
  });

  it("throws on invalid date string", () => {
    expect(() =>
      resolveTimeWindow({ from: "not-a-date", to: "2026-01-01" }),
    ).toThrow("Cannot parse date value");
  });
});
