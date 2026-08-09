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
  parseResponses,
  isCollection,
  mergedProps,
  propOrNull,
  WebDAVHttpError,
  type WebDAVTransport,
} from "@dav-worker/clients-webdav";
import { calendarPath } from "./url.js";
import { lookupByUid } from "./uid-lookup.js";
import {
  listAllQueryBody,
  parseReportResponses,
  CALDAV_COLLECTION_PROPFIND_BODY,
  supportsComponent,
  isDeletedCalendar,
  xmlEscape,
} from "./report.js";
import {
  ICAL_CONTENT_TYPE,
  calDAVBasePath,
  createNextcloudTransport,
} from "../utils.js";

function uidFromIcs(ics: string | null): string {
  if (!ics) return "";
  const vtodo = findComponent(parseCalendar(ics), "VTODO");
  return (vtodo && getText(vtodo, "UID")) ?? "";
}

// PROPFIND a single collection path (Depth: 0) and report whether it's
// live, trashed, or absent — used by listCreate to give a precise error
// instead of MKCOL's ambiguous 405 (identical for "slug is a live list"
// and "slug is trashed"; see isDeletedCalendar's comment).
async function collectionState(
  transport: WebDAVTransport,
  collectionPath: string,
): Promise<"live" | "trashed" | "absent"> {
  let res;
  try {
    res = await transport.request("PROPFIND", collectionPath, {
      headers: { Depth: "0", "Content-Type": "application/xml" },
      body: CALDAV_COLLECTION_PROPFIND_BODY,
      expectStatus: [207, 404],
    });
  } catch {
    return "absent";
  }
  if (res.status === 404) return "absent";
  const responses = parseResponses(await res.text());
  const self = responses[0];
  if (!self) return "absent";
  return isDeletedCalendar(mergedProps(self)) ? "trashed" : "live";
}

export function createNextcloudCalDAVTaskStorage(credential: Credential): TaskStorage {
  const { transport, cred } = createNextcloudTransport(credential);
  const basePath = calDAVBasePath(cred.username);

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

    // list-management (MKCOL/DELETE/PROPFIND) — VTODO-only collections
    // are otherwise identical WebDAV collections to files/calendars.
    async listCreate(name, color) {
      // Uses Extended MKCOL (RFC 5689) rather than the MKCALENDAR method
      // CalDAV (RFC 4791) itself defines. The two are equivalent per
      // spec — Extended MKCOL creates the same calendar-collection
      // resourcetype, just via a plain MKCOL verb with resourcetype set
      // in the request body instead of a dedicated method — but
      // workerd's fetch() rejects the literal string "MKCALENDAR" as an
      // invalid HTTP method before the request is ever sent (confirmed:
      // MKCOL, PROPFIND, and REPORT all pass through fine as literal
      // fetch() methods; MKCALENDAR alone throws "Invalid HTTP method
      // string"). Nextcloud's SabreDAV dispatches purely on the request
      // body's root XML element and confirmed-works with this shape
      // (verified live: 201 Created). X-HTTP-Method-Override is NOT an
      // alternative here — SabreDAV ignores it and errors on body/verb
      // mismatch instead.
      //
      // ic:calendar-color is set in this same MKCOL <d:set> block when
      // `color` is given, rather than a separate follow-up PROPPATCH —
      // one fewer request, and matches how displayname is already set
      // at creation time in the same body.
      const colorProp = color
        ? `\n      <ic:calendar-color>${xmlEscape(color)}</ic:calendar-color>`
        : "";
      const body = `<?xml version="1.0" encoding="utf-8"?>
<d:mkcol xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">
  <d:set>
    <d:prop>
      <d:resourcetype>
        <d:collection/>
        <c:calendar/>
      </d:resourcetype>
      <d:displayname>${xmlEscape(name)}</d:displayname>
      <c:supported-calendar-component-set>
        <c:comp name="VTODO"/>
      </c:supported-calendar-component-set>${colorProp}
    </d:prop>
  </d:set>
</d:mkcol>`;
      try {
        await transport.request("MKCOL", path(name), {
          headers: { "Content-Type": "application/xml" },
          body,
          expectStatus: [201],
        });
      } catch (e) {
        // MKCOL's 405/409 on a colliding path is identical whether the
        // slug is a live list or one sitting in Nextcloud's calendar
        // trash (soft-deleted by a prior listDelete, not yet purged —
        // see isDeletedCalendar's comment) — Sabre doesn't distinguish
        // in the MKCOL response itself. A follow-up single-collection
        // PROPFIND does distinguish (the trashed marker is a real prop),
        // so use it to turn the generic error into a precise one rather
        // than passing the ambiguous 405 straight through.
        if (e instanceof WebDAVHttpError && (e.status === 405 || e.status === 409)) {
          const state = await collectionState(transport, path(name));
          if (state === "trashed") {
            const trashedError = new Error(
              `A task list named "${name}" was deleted recently and is still in Nextcloud's ` +
                `calendar trash — that reserves the name until the trash is emptied. Use a ` +
                `different name, or empty the calendar trash in Nextcloud.`,
            );
            // { cause } isn't available at this tsconfig's es2021 target —
            // set it manually rather than bumping the whole package's
            // target for one call site.
            (trashedError as { cause?: unknown }).cause = e;
            throw trashedError;
          }
        }
        throw e;
      }
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

      const responses = parseResponses(await res.text());

      return responses
        .slice(1)
        .filter((r) => {
          const prop = mergedProps(r);
          return (
            isCollection(prop) && supportsComponent(prop, "VTODO") && !isDeletedCalendar(prop)
          );
        })
        .map((r) => {
          const decodedHref = decodeURIComponent(r.href.replace(/\/$/, ""));
          const slug = decodedHref.split("/").pop() ?? "";
          const props = mergedProps(r);
          const displayName = propOrNull(props.displayname) ?? slug;
          const color = propOrNull(props["calendar-color"]);
          return { slug, displayName, color };
        });
    },
  };
}
