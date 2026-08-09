import { describe, it, expect, vi } from "vitest";
import { findEventAcrossCalendars } from "./find";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import type { CalendarStorage, ReportEntry } from "@dav-worker/calendar-contracts";
import { parseCalendarConfig } from "../calendars";

function makeStorage(
  findByUid: CalendarStorage["findByUid"],
): CalendarStorage {
  return { findByUid } as CalendarStorage;
}

const config = parseCalendarConfig({
  work: ["work", "#ffffff"],
  home: ["home", "#000000"],
});

const entry: ReportEntry = { href: "/work/1.ics", etag: "e", calendarData: "ICS" };

describe("findEventAcrossCalendars", () => {
  it("returns the first calendar with a match", async () => {
    const findByUid = vi
      .fn()
      .mockImplementation(async (calendarName: string) =>
        calendarName === "work" ? entry : null,
      );
    const result = await findEventAcrossCalendars(
      makeStorage(findByUid),
      config,
      "VEVENT",
      "uid-1",
    );
    expect(result.found).toEqual({ calendarName: "work", entry });
    expect(result.warnings).toEqual([]);
  });

  it("returns null found and no warnings when nothing matches", async () => {
    const findByUid = vi.fn().mockResolvedValue(null);
    const result = await findEventAcrossCalendars(
      makeStorage(findByUid),
      config,
      "VEVENT",
      "uid-1",
    );
    expect(result.found).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("collects a warning for a 404'd calendar and keeps searching", async () => {
    const findByUid = vi.fn().mockImplementation(async (calendarName: string) => {
      if (calendarName === "work") {
        throw new WebDAVHttpError("REPORT", "/work", 404);
      }
      return entry;
    });
    const result = await findEventAcrossCalendars(
      makeStorage(findByUid),
      config,
      "VEVENT",
      "uid-1",
    );
    expect(result.found).toEqual({ calendarName: "home", entry });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Calendar "work"');
  });

  it("rethrows a non-404 error immediately", async () => {
    const findByUid = vi
      .fn()
      .mockRejectedValue(new WebDAVHttpError("REPORT", "/work", 500));
    await expect(
      findEventAcrossCalendars(makeStorage(findByUid), config, "VEVENT", "uid-1"),
    ).rejects.toBeInstanceOf(WebDAVHttpError);
  });
});
