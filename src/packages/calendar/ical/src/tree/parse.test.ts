import { describe, it, expect } from "vitest";
import { unfold, parseCalendar } from "../../index";

describe("unfold", () => {
  it("unfolds CRLF continuation lines", () => {
    const input = "DESCRIPTION:Line 1\r\n Line 2\r\n Line 3";
    expect(unfold(input)).toEqual(["DESCRIPTION:Line 1Line 2Line 3"]);
  });

  it("unfolds bare LF continuation lines", () => {
    const input = "DESCRIPTION:Line 1\n Line 2";
    expect(unfold(input)).toEqual(["DESCRIPTION:Line 1Line 2"]);
  });

  it("unfolds tab continuation lines", () => {
    const input = "DESCRIPTION:Line 1\n\tLine 2";
    expect(unfold(input)).toEqual(["DESCRIPTION:Line 1Line 2"]);
  });

  it("preserves multiple lines", () => {
    const input = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR";
    expect(unfold(input)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "END:VCALENDAR",
    ]);
  });

  it("skips empty lines", () => {
    const input = "LINE1\n\nLINE2";
    expect(unfold(input)).toEqual(["LINE1", "LINE2"]);
  });
});

describe("parseCalendar", () => {
  it("parses a simple VCALENDAR", () => {
    const text = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
END:VCALENDAR`;
    const cal = parseCalendar(text);
    expect(cal.name).toBe("VCALENDAR");
    expect(cal.properties.VERSION?.[0]?.value).toBe("2.0");
    expect(cal.properties.PRODID?.[0]?.value).toBe("-//Test//EN");
  });

  it("parses nested VEVENT component", () => {
    const text = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-123
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR`;
    const cal = parseCalendar(text);
    expect(cal.components).toHaveLength(1);
    expect(cal.components[0].name).toBe("VEVENT");
    expect(cal.components[0].properties.UID?.[0]?.value).toBe("test-123");
  });

  it("throws on empty text", () => {
    expect(() => parseCalendar("")).toThrow("Empty iCalendar text");
  });

  it("throws on mismatched END", () => {
    const text = `BEGIN:VCALENDAR
END:VEVENT`;
    expect(() => parseCalendar(text)).toThrow("Mismatched END");
  });

  it("throws on unterminated component", () => {
    const text = `BEGIN:VCALENDAR
VERSION:2.0`;
    expect(() => parseCalendar(text)).toThrow("Unterminated component");
  });

  it("handles params with quoted colons", () => {
    const text = `BEGIN:VCALENDAR
TZID;X-VOBJ-ORIGINAL-START="DTSTART:090000":20240101T090000
END:VCALENDAR`;
    const cal = parseCalendar(text);
    expect(cal.properties["TZID"]?.[0]?.params["X-VOBJ-ORIGINAL-START"]).toBe(
      "DTSTART:090000",
    );
  });
});
