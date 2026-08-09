import { describe, it, expect } from "vitest";
import {
  newComponent,
  getText,
  setText,
  removeProperty,
  addProperty,
  getDateTime,
  setDateTime,
  stampComponent,
} from "../../index";

describe("property accessors", () => {
  it("getText returns unescaped text", () => {
    const comp = newComponent("VEVENT");
    comp.properties.SUMMARY = [{ value: "Hello\\, World", params: {} }];
    expect(getText(comp, "SUMMARY")).toBe("Hello, World");
  });

  it("getText returns undefined for missing property", () => {
    const comp = newComponent("VEVENT");
    expect(getText(comp, "SUMMARY")).toBeUndefined();
  });

  it("setText sets escaped text", () => {
    const comp = newComponent("VEVENT");
    setText(comp, "SUMMARY", "Hello, World");
    expect(comp.properties.SUMMARY?.[0]?.value).toBe("Hello\\, World");
  });

  it("removeProperty deletes property", () => {
    const comp = newComponent("VEVENT");
    comp.properties.SUMMARY = [{ value: "Test", params: {} }];
    removeProperty(comp, "SUMMARY");
    expect(comp.properties.SUMMARY).toBeUndefined();
  });

  it("addProperty appends to existing", () => {
    const comp = newComponent("VEVENT");
    addProperty(comp, "ATTENDEE", "mailto:a@example.com");
    addProperty(comp, "ATTENDEE", "mailto:b@example.com");
    expect(comp.properties.ATTENDEE).toHaveLength(2);
  });
});

describe("datetime accessors", () => {
  it("getDateTime returns parsed datetime", () => {
    const comp = newComponent("VEVENT");
    comp.properties.DTSTART = [{ value: "20240115T093000Z", params: {} }];
    const dt = getDateTime(comp, "DTSTART");
    expect(dt?.raw).toBe("20240115T093000Z");
    expect(dt?.isDate).toBe(false);
    expect(dt?.tzid).toBeUndefined();
  });

  it("getDateTime handles DATE type", () => {
    const comp = newComponent("VEVENT");
    comp.properties.DTSTART = [
      { value: "20240115", params: { VALUE: "DATE" } },
    ];
    const dt = getDateTime(comp, "DTSTART");
    expect(dt?.isDate).toBe(true);
  });

  it("getDateTime handles TZID param", () => {
    const comp = newComponent("VEVENT");
    comp.properties.DTSTART = [
      { value: "20240115T093000", params: { TZID: "America/New_York" } },
    ];
    const dt = getDateTime(comp, "DTSTART");
    expect(dt?.tzid).toBe("America/New_York");
  });

  it("setDateTime sets ISO datetime in basic format", () => {
    const comp = newComponent("VEVENT");
    setDateTime(comp, "DTSTART", "2024-01-15T09:30:00Z");
    expect(comp.properties.DTSTART?.[0]?.value).toBe("20240115T093000Z");
  });

  it("setDateTime handles allDay option", () => {
    const comp = newComponent("VEVENT");
    setDateTime(comp, "DTSTART", "2024-01-15", { allDay: true });
    expect(comp.properties.DTSTART?.[0]?.value).toBe("20240115");
    expect(comp.properties.DTSTART?.[0]?.params.VALUE).toBe("DATE");
  });

  it("setDateTime handles TZID option", () => {
    const comp = newComponent("VEVENT");
    setDateTime(comp, "DTSTART", "2024-01-15T09:30:00", {
      tzid: "America/New_York",
    });
    expect(comp.properties.DTSTART?.[0]?.params.TZID).toBe("America/New_York");
  });
});

describe("stampComponent", () => {
  it("sets DTSTAMP and LAST-MODIFIED", () => {
    const comp = newComponent("VEVENT");
    stampComponent(comp);
    expect(comp.properties.DTSTAMP).toBeDefined();
    expect(comp.properties["LAST-MODIFIED"]).toBeDefined();
    expect(comp.properties.DTSTAMP?.[0]?.value).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("updates existing stamps", () => {
    const comp = newComponent("VEVENT");
    comp.properties.DTSTAMP = [{ value: "20240101T000000Z", params: {} }];
    stampComponent(comp);
    expect(comp.properties.DTSTAMP?.[0]?.value).not.toBe("20240101T000000Z");
  });
});
