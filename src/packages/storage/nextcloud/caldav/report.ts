// REPORT-body builders + response parser for CalDAV, ported unchanged from
// src/clients/caldav/report.ts. ComponentType/ReportEntry now live in
// @dav-worker/calendar-contracts (the CalendarStorage contract) rather than
// being redefined here — this file only builds/parses XML.

import { xmlParser, decodeMissedNumericEntities } from "@dav-worker/clients-webdav";
import type { ComponentType, ReportEntry } from "@dav-worker/calendar-contracts";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

export function travelForQueryBody(parentUid: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:prop-filter name="X-DAV-WORKER-TRAVEL-FOR">
          <c:text-match>${xmlEscape(parentUid)}</c:text-match>
        </c:prop-filter>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

export function timeRangeQueryBody(
  componentType: ComponentType,
  startUtc: string,
  endUtc: string,
): string {
  const calendarDataElement =
    componentType === "VEVENT"
      ? `<c:calendar-data><c:expand start="${startUtc}" end="${endUtc}"/></c:calendar-data>`
      : `<c:calendar-data/>`;

  return `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    ${calendarDataElement}
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
        ? decodeMissedNumericEntities(String(merged["calendar-data"]))
        : null,
    };
  });
}
