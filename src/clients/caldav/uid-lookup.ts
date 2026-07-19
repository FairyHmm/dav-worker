import { NextcloudBase } from "../base.js";
import { uidQueryBody, parseReportResponses } from "./report.js";
import type { ComponentType, ReportEntry } from "./report.js";

// Resolves a client-facing UID to its CalDAV href + etag + raw calendar-data
// via a REPORT query — CalDAV has no direct UID→href lookup, so this is the
// one extra request every update/delete pays (SPEC.md risk #3). Isolated
// here as a single shared function, called by both Schedule (VEVENT) and
// Tasks (VTODO), rather than re-implemented per tool.
//
// Takes a plain NextcloudBase (not CalDAVClient) to avoid a circular import
// between this module and clients/caldav/index.ts.
export async function lookupByUid(
  client: NextcloudBase,
  calendarPath: string,
  componentType: ComponentType,
  uid: string,
): Promise<ReportEntry | null> {
  const res = await client.request("REPORT", calendarPath, {
    headers: { Depth: "1", "Content-Type": "application/xml" },
    body: uidQueryBody(componentType, uid),
    expectStatus: [207],
  });

  const xml = await res.text();
  const entries = parseReportResponses(xml);
  return entries[0] ?? null;
}
