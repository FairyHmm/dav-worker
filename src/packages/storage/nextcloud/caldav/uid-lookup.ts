import type { WebDAVTransport } from "@dav-worker/clients-webdav";
import type { ComponentType, ReportEntry } from "@dav-worker/calendar-contracts";
import { uidQueryBody, parseReportResponses } from "./report.js";

// Resolves a client-facing UID to href/etag/calendar-data via a REPORT
// query — CalDAV has no direct UID→href lookup, so this is the one extra
// request every update/delete pays (SPEC.md risk #3). Takes a plain
// WebDAVTransport (not the adapter itself) to avoid a circular import
// between this module and index.ts.
export async function lookupByUid(
  transport: WebDAVTransport,
  calendarPath: string,
  componentType: ComponentType,
  uid: string,
): Promise<ReportEntry | null> {
  const res = await transport.request("REPORT", calendarPath, {
    headers: { Depth: "1", "Content-Type": "application/xml" },
    body: uidQueryBody(componentType, uid),
    expectStatus: [207],
  });

  const xml = await res.text();
  const entries = parseReportResponses(xml);
  return entries[0] ?? null;
}
