import { describe, it, expect } from "vitest";
import {
  supportsComponent,
  isDeletedCalendar,
  xmlEscape,
  uidQueryBody,
  listAllQueryBody,
  travelForQueryBody,
  timeRangeQueryBody,
  parseReportResponses,
} from "./report";

describe("supportsComponent", () => {
  it("returns true when comp set is a single object with matching name", () => {
    const prop = {
      "supported-calendar-component-set": { comp: { "@_name": "VEVENT" } },
    };
    expect(supportsComponent(prop, "VEVENT")).toBe(true);
  });

  it("returns true when comp set is an array containing the name", () => {
    const prop = {
      "supported-calendar-component-set": {
        comp: [{ "@_name": "VEVENT" }, { "@_name": "VTODO" }],
      },
    };
    expect(supportsComponent(prop, "VTODO")).toBe(true);
  });

  it("returns false when name is absent", () => {
    const prop = {
      "supported-calendar-component-set": { comp: { "@_name": "VEVENT" } },
    };
    expect(supportsComponent(prop, "VTODO")).toBe(false);
  });

  it("returns false when comp set is missing", () => {
    expect(supportsComponent({}, "VEVENT")).toBe(false);
    expect(supportsComponent(null, "VEVENT")).toBe(false);
    expect(supportsComponent(undefined, "VEVENT")).toBe(false);
  });
});

describe("isDeletedCalendar", () => {
  it("returns true when resourcetype has deleted-calendar marker", () => {
    expect(
      isDeletedCalendar({
        resourcetype: { collection: "", "deleted-calendar": "" },
      }),
    ).toBe(true);
  });

  it("returns false for a live collection", () => {
    expect(isDeletedCalendar({ resourcetype: { collection: "" } })).toBe(
      false,
    );
  });

  it("returns false when resourcetype is missing", () => {
    expect(isDeletedCalendar({})).toBe(false);
    expect(isDeletedCalendar(null)).toBe(false);
    expect(isDeletedCalendar(undefined)).toBe(false);
  });
});

describe("xmlEscape", () => {
  it("escapes all five reserved characters", () => {
    expect(xmlEscape(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("passes through text with nothing to escape", () => {
    expect(xmlEscape("plain text")).toBe("plain text");
  });
});

describe("uidQueryBody", () => {
  it("embeds component type and escaped uid", () => {
    const body = uidQueryBody("VEVENT", `uid&"1`);
    expect(body).toContain('<c:comp-filter name="VEVENT">');
    expect(body).toContain("uid&amp;&quot;1");
  });
});

describe("listAllQueryBody", () => {
  it("embeds component type with no filter body", () => {
    const body = listAllQueryBody("VTODO");
    expect(body).toContain('<c:comp-filter name="VTODO"/>');
  });
});

describe("travelForQueryBody", () => {
  it("embeds escaped parent uid in a text-match filter", () => {
    const body = travelForQueryBody(`parent&1`);
    expect(body).toContain("X-DAV-WORKER-TRAVEL-FOR");
    expect(body).toContain("parent&amp;1");
  });
});

describe("timeRangeQueryBody", () => {
  it("uses expand for VEVENT", () => {
    const body = timeRangeQueryBody("VEVENT", "20260101T000000Z", "20260201T000000Z");
    expect(body).toContain(
      '<c:expand start="20260101T000000Z" end="20260201T000000Z"/>',
    );
    expect(body).toContain(
      '<c:time-range start="20260101T000000Z" end="20260201T000000Z"/>',
    );
  });

  it("omits expand for VTODO", () => {
    const body = timeRangeQueryBody("VTODO", "20260101T000000Z", "20260201T000000Z");
    expect(body).not.toContain("c:expand");
    expect(body).toContain("<c:calendar-data/>");
  });
});

describe("parseReportResponses", () => {
  it("parses href, etag, and calendar-data from a single response", () => {
    const xml = `<?xml version="1.0"?>
<multistatus>
  <response>
    <href>/remote.php/dav/calendars/fairy/work/1.ics</href>
    <propstat>
      <prop>
        <getetag>"abc123"</getetag>
        <calendar-data>BEGIN:VCALENDAR&#13;END:VCALENDAR</calendar-data>
      </prop>
    </propstat>
  </response>
</multistatus>`;
    const entries = parseReportResponses(xml);
    expect(entries).toHaveLength(1);
    expect(entries[0].href).toBe(
      "/remote.php/dav/calendars/fairy/work/1.ics",
    );
    expect(entries[0].etag).toBe('"abc123"');
    expect(entries[0].calendarData).toBe("BEGIN:VCALENDAR\rEND:VCALENDAR");
  });

  it("decodes url-encoded href", () => {
    const xml = `<?xml version="1.0"?>
<multistatus>
  <response>
    <href>/remote.php/dav/calendars/fairy/work/my%20event.ics</href>
    <propstat><prop><getetag>"x"</getetag></prop></propstat>
  </response>
</multistatus>`;
    const entries = parseReportResponses(xml);
    expect(entries[0].href).toBe(
      "/remote.php/dav/calendars/fairy/work/my event.ics",
    );
  });

  it("returns null etag and calendarData when props are absent", () => {
    const xml = `<?xml version="1.0"?>
<multistatus>
  <response>
    <href>/remote.php/dav/calendars/fairy/work/2.ics</href>
    <propstat><prop></prop></propstat>
  </response>
</multistatus>`;
    const entries = parseReportResponses(xml);
    expect(entries[0].etag).toBeNull();
    expect(entries[0].calendarData).toBeNull();
  });

  it("merges multiple propstats per response", () => {
    const xml = `<?xml version="1.0"?>
<multistatus>
  <response>
    <href>/x.ics</href>
    <propstat><prop><getetag>"e1"</getetag></prop></propstat>
    <propstat><prop><calendar-data>BODY</calendar-data></prop></propstat>
  </response>
</multistatus>`;
    const entries = parseReportResponses(xml);
    expect(entries[0].etag).toBe('"e1"');
    expect(entries[0].calendarData).toBe("BODY");
  });

  it("returns empty array for no responses", () => {
    expect(parseReportResponses("<multistatus></multistatus>")).toEqual([]);
  });
});
