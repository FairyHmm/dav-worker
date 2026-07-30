// Task (VTODO) adapter, living alongside the calendar (VEVENT) adapter in
// this same caldav/ folder since both are just "speak CalDAV against a
// Nextcloud collection" over the same transport, same account, same
// REPORT/PUT/DELETE mechanics — only the componentType and the resulting
// contract shape differ. Storage's boundary is the protocol/transport,
// not the tools-layer domain split (calendar vs tasks); see
// task-contracts' own comment for why the *contract* itself stays
// independent of CalendarStorage even though this implementation is thin.

import type { Credential } from "@dav-worker/auth-upstream";
import type { TaskStorage, TaskEntry } from "@dav-worker/task-contracts";
import { parseCalendar, findComponent, getText } from "@dav-worker/calendar-ical";
import {
  createWebDAVTransport,
  xmlParser,
  isCollection,
  mergedProps,
  propOrNull,
} from "@dav-worker/clients-webdav";
import { asNextcloudCredential, basicAuthHeader } from "../credential.js";
import { calendarPath } from "./url.js";
import { lookupByUid } from "./uid-lookup.js";
import {
  listAllQueryBody,
  parseReportResponses,
  CALDAV_COLLECTION_PROPFIND_BODY,
  supportsComponent,
  xmlEscape,
} from "./report.js";

const ICAL_CONTENT_TYPE = "text/calendar; charset=utf-8";

function uidFromIcs(ics: string | null): string {
  if (!ics) return "";
  const vtodo = findComponent(parseCalendar(ics), "VTODO");
  return (vtodo && getText(vtodo, "UID")) ?? "";
}

export function createNextcloudCalDAVTaskStorage(credential: Credential): TaskStorage {
  const cred = asNextcloudCredential(credential);
  const transport = createWebDAVTransport(cred.host, basicAuthHeader(cred));
  const basePath = `/remote.php/dav/calendars/${cred.username}`;

  const path = (collectionName: string) => calendarPath(basePath, collectionName);

  return {
    async findByUid(list, uid) {
      const entry = await lookupByUid(transport, path(list), "VTODO", uid);
      if (!entry) return null;
      return { uid, ics: entry.calendarData };
    },

    async list(list) {
      const res = await transport.request("REPORT", path(list), {
        headers: { Depth: "1", "Content-Type": "application/xml" },
        body: listAllQueryBody("VTODO"),
        expectStatus: [207],
      });
      const entries = parseReportResponses(await res.text());
      return entries.map(
        (e): TaskEntry => ({ uid: uidFromIcs(e.calendarData), ics: e.calendarData }),
      );
    },

    async create(list, uid, icsBody) {
      const href = `${path(list)}${encodeURIComponent(uid)}.ics`;
      await transport.request("PUT", href, {
        headers: { "Content-Type": ICAL_CONTENT_TYPE },
        body: icsBody,
        expectStatus: [201, 204],
      });
    },

    async update(list, uid, icsBody) {
      const entry = await lookupByUid(transport, path(list), "VTODO", uid);
      if (!entry) throw new Error(`No task found with id: ${uid}`);
      await transport.request("PUT", entry.href, {
        headers: { "Content-Type": ICAL_CONTENT_TYPE },
        body: icsBody,
        expectStatus: [201, 204],
      });
    },

    async delete(list, uid) {
      const entry = await lookupByUid(transport, path(list), "VTODO", uid);
      if (!entry) return; // idempotent, same contract as calendar's delete
      await transport.request("DELETE", entry.href, { expectStatus: [204, 404] });
    },

    // list-management (MKCALENDAR/DELETE/PROPFIND) — VTODO-only collections
    // are otherwise identical WebDAV collections to files/calendars.
    async listCreate(name) {
      const body = `<?xml version="1.0" encoding="utf-8"?>
<c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:set>
    <d:prop>
      <d:displayname>${xmlEscape(name)}</d:displayname>
      <c:supported-calendar-component-set>
        <c:comp name="VTODO"/>
      </c:supported-calendar-component-set>
    </d:prop>
  </d:set>
</c:mkcalendar>`;
      await transport.request("MKCALENDAR", path(name), {
        headers: { "Content-Type": "application/xml" },
        body,
        expectStatus: [201],
      });
    },

    async listDelete(slug) {
      await transport.request("DELETE", path(slug), { expectStatus: [200, 204, 404] });
    },

    // PROPFIND at Depth: 1 over basePath, filtered to collections that
    // advertise VTODO support — Nextcloud's calendars home mixes VEVENT
    // calendars and VTODO-only task lists as sibling collections, so a
    // plain "is this a collection" check (files' webdav.ts's list()
    // shape) isn't enough here; supportsComponent distinguishes them.
    // Skip index 0 (basePath responds for itself first, same as any
    // WebDAV collection listing). Slug comes from the href's last path
    // segment rather than displayname — displayname is user-editable free
    // text, the slug is what list_create/task_create/task_list actually
    // address the collection by.
    async listAll() {
      let reqUrl = basePath;
      if (!reqUrl.endsWith("/")) reqUrl += "/";

      const res = await transport.request("PROPFIND", reqUrl, {
        headers: { Depth: "1", "Content-Type": "application/xml" },
        body: CALDAV_COLLECTION_PROPFIND_BODY,
      });

      const xml = await res.text();
      const parsed = xmlParser.parse(xml);
      const responses: any[] = [].concat(parsed.multistatus?.response ?? []);

      return responses
        .slice(1)
        .filter((r) => {
          const prop = mergedProps(r);
          return isCollection(prop) && supportsComponent(prop, "VTODO");
        })
        .map((r) => {
          const decodedHref = decodeURIComponent(String(r.href ?? "").replace(/\/$/, ""));
          const slug = decodedHref.split("/").pop() ?? "";
          const displayName = propOrNull(mergedProps(r).displayname) ?? slug;
          return { slug, displayName };
        });
    },
  };
}
