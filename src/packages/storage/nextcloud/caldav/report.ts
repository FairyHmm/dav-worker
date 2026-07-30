// REPORT-body builders + response parser for CalDAV, ported unchanged from
// src/clients/caldav/report.ts. ComponentType/ReportEntry now live in
// @dav-worker/calendar-contracts (the CalendarStorage contract) rather than
// being redefined here — this file only builds/parses XML.

import { xmlParser, decodeMissedNumericEntities } from "@dav-worker/clients-webdav";
import type { ComponentType, ReportEntry } from "@dav-worker/calendar-contracts";

// PROPFIND body for listing collections under a calendars home (basePath),
// CalDAV-flavored: adds supported-calendar-component-set to the generic
// clients-webdav PROPFIND_BODY's props (resourcetype/displayname/etc).
// Nextcloud's calendars home mixes VEVENT calendars and VTODO-only task
// lists as sibling collections with no other distinguishing prop — this is
// the only way to tell which is which without opening each one.
export const CALDAV_COLLECTION_PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:resourcetype/>
    <d:displayname/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`;

// True if a collection's supported-calendar-component-set advertises the
// given component type. fast-xml-parser renders repeated <c:comp/>
// elements as either a single object or an array depending on count, so
// this normalizes both shapes the same way mergedProps'/isCollection's
// callers already do for other multi-valued props.
export function supportsComponent(prop: any, componentType: ComponentType): boolean {
  const compSet = prop?.["supported-calendar-component-set"];
  if (!compSet) return false;
  const comps: any[] = [].concat(compSet.comp ?? []);
  return comps.some((c) => c?.["@_name"] === componentType);
}

// True if a collection is Nextcloud's soft-deleted state (moved to its
// server-side calendar trash, not yet purged) — resourcetype carries a
// nextcloud.com-namespaced <deleted-calendar/> marker alongside the normal
// <collection/> one, and the collection otherwise still answers PROPFIND/
// REPORT/DELETE as if it existed. listAll() needs to exclude these, or a
// list_delete'd task list keeps reappearing until Nextcloud's trash purge
// runs (same removeNSPrefix normalization as isCollection's "collection"
// check — the nextcloud.com prefix is stripped, so the bare key is used).
export function isDeletedCalendar(prop: any): boolean {
  return !!prop?.resourcetype && "deleted-calendar" in prop.resourcetype;
}

export function xmlEscape(value: string): string {
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

// Unfiltered listing of every component of a given type in a collection —
// used by task_list (no time-range concept for VTODO, unlike listByTimeRange).
export function listAllQueryBody(componentType: ComponentType): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="${componentType}"/>
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
