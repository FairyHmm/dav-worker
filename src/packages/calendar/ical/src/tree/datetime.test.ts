import { describe, it, expect } from "vitest";
import { isoToBasic, basicToIso, nowStamp } from "../../index";

describe("isoToBasic / basicToIso", () => {
  it("converts ISO datetime to basic format", () => {
    expect(isoToBasic("2024-01-15T09:30:00Z")).toBe("20240115T093000Z");
  });

  it("converts basic format to ISO", () => {
    expect(basicToIso("20240115T093000Z")).toBe("2024-01-15T09:30:00Z");
  });

  it("round-trips datetime", () => {
    const iso = "2024-01-15T09:30:00Z";
    expect(basicToIso(isoToBasic(iso))).toBe(iso);
  });

  it("handles date-only format", () => {
    expect(isoToBasic("2024-01-15")).toBe("20240115");
    expect(basicToIso("20240115")).toBe("2024-01-15");
  });

  it("handles non-UTC time", () => {
    expect(isoToBasic("2024-01-15T09:30:00")).toBe("20240115T093000");
    expect(basicToIso("20240115T093000")).toBe("2024-01-15T09:30:00");
  });

  it("strips fractional seconds", () => {
    expect(isoToBasic("2024-01-15T09:30:00.123Z")).toBe("20240115T093000Z");
  });
});

describe("nowStamp", () => {
  it("returns basic UTC format", () => {
    const stamp = nowStamp();
    expect(stamp).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("returns current time (within 1 second)", () => {
    const before = Date.now();
    const stamp = nowStamp();
    const after = Date.now();
    const stampMs = new Date(
      `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`,
    ).getTime();
    expect(stampMs).toBeGreaterThanOrEqual(before - 1000);
    expect(stampMs).toBeLessThanOrEqual(after + 1000);
  });
});
