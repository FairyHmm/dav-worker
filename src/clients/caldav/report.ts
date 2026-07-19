import { xmlParser } from "../webdav/xml.js";

export type ComponentType = "VEVENT" | "VTODO";

export interface ReportEntry {
  href: string;
  etag: string | null;
  calendarData: string | null;
}

// Minimal XML-text escaping for values interpolated into REPORT request
// bodies (e.g. a UID inside <c:text-match>). This is NOT iCalendar TEXT
// escaping — that's ical/escape.ts's job for VEVENT/VTODO field values
// (SUMMARY, DESCRIPTION, RRULE), a separate concern from safely embedding a
// value inside an XML request body.
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// calendar-query REPORT filtered by UID via a prop-filter/text-match. This is
// the "one extra request" UID → href/etag/calendar-data lookup SPEC.md risk
// #3 calls out — used by both Schedule (VEVENT) and Tasks (VTODO).
export function uidQueryBody(componentType: ComponentType, uid: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="${componentType}">
        <c:prop-filter name="UID">
          <c:text-match>${xmlEscape(uid)}</c:text-match>
        </c:prop-filter>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

// calendar-query REPORT with a time-range comp-filter, for listing events in
// a window. `startUtc`/`endUtc` must already be RFC 5545 UTC basic-format
// strings (YYYYMMDDTHHMMSSZ) — formatting belongs to the caller (tools layer)
// since it depends on the incoming time-window shape (relative days / preset
// / absolute), not to this REPORT-body builder.
export function timeRangeQueryBody(
  componentType: ComponentType,
  startUtc: string,
  endUtc: string,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="${componentType}">
        <c:time-range start="${startUtc}" end="${endUtc}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

// Parses a multistatus REPORT response into one entry per matched resource.
// Mirrors webdav/xml.ts's mergedProps handling: Nextcloud can split a
// <d:response> into multiple <d:propstat> blocks (e.g. one 200 with the
// requested props, one 404 for anything inapplicable) — merge before reading
// rather than assuming a single propstat.
export function parseReportResponses(xml: string): ReportEntry[] {
  const parsed = xmlParser.parse(xml);
  const responses: any[] = [].concat(parsed.multistatus?.response ?? []);

  return responses.map((r: any) => {
    const propstats: any[] = [].concat(r.propstat ?? []);
    const merged = propstats.reduce(
      (acc, ps) => Object.assign(acc, ps?.prop ?? {}),
      {} as any,
    );

    return {
      href: decodeURIComponent(String(r.href ?? "")),
      etag: merged.getetag ? String(merged.getetag) : null,
      calendarData: merged["calendar-data"]
        ? String(merged["calendar-data"])
        : null,
    };
  });
}
