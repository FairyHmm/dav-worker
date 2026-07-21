// Nextcloud-specific CalDAV adapter implementing CalendarStorage from
// @dav-worker/calendar-contracts. Behavior ported unchanged from
// src/clients/caldav/index.ts (CalDAVClient).

import type { Credential } from "@dav-worker/auth-upstream";
import type { CalendarStorage } from "@dav-worker/calendar-contracts";
import { createWebDAVTransport } from "@dav-worker/clients-webdav";
import { asNextcloudCredential, basicAuthHeader } from "../credential.js";
import { calendarPath } from "./url.js";
import { lookupByUid } from "./uid-lookup.js";
import { timeRangeQueryBody, travelForQueryBody, parseReportResponses } from "./report.js";

const ICAL_CONTENT_TYPE = "text/calendar; charset=utf-8";

export function createNextcloudCalDAVStorage(credential: Credential): CalendarStorage {
  const cred = asNextcloudCredential(credential);
  const transport = createWebDAVTransport(cred.host, basicAuthHeader(cred));
  const basePath = `/remote.php/dav/calendars/${cred.username}`;

  const path = (calendarName: string) => calendarPath(basePath, calendarName);

  return {
    async findByUid(calendarName, componentType, uid) {
      return lookupByUid(transport, path(calendarName), componentType, uid);
    },

    async listByTimeRange(calendarName, componentType, startUtc, endUtc) {
      const res = await transport.request("REPORT", path(calendarName), {
        headers: { Depth: "1", "Content-Type": "application/xml" },
        body: timeRangeQueryBody(componentType, startUtc, endUtc),
        expectStatus: [207],
      });
      return parseReportResponses(await res.text());
    },

    async create(calendarName, uid, icsBody) {
      const href = `${path(calendarName)}${encodeURIComponent(uid)}.ics`;
      await transport.request("PUT", href, {
        headers: { "Content-Type": ICAL_CONTENT_TYPE },
        body: icsBody,
        expectStatus: [201, 204],
      });
    },

    async update(calendarName, componentType, uid, icsBody) {
      const entry = await lookupByUid(transport, path(calendarName), componentType, uid);
      if (!entry) {
        throw new Error(`No ${componentType} found with id: ${uid}`);
      }
      await transport.request("PUT", entry.href, {
        headers: { "Content-Type": ICAL_CONTENT_TYPE },
        body: icsBody,
        expectStatus: [201, 204],
      });
    },

    async delete(calendarName, componentType, uid) {
      const entry = await lookupByUid(transport, path(calendarName), componentType, uid);
      if (!entry) return; // idempotent per SPEC-SCHEDULES.md — already gone

      await transport.request("DELETE", entry.href, { expectStatus: [204, 404] });
    },

    async findTravelBuffersFor(calendarName, parentUid) {
      const res = await transport.request("REPORT", path(calendarName), {
        headers: { Depth: "1", "Content-Type": "application/xml" },
        body: travelForQueryBody(parentUid),
        expectStatus: [207],
      });
      return parseReportResponses(await res.text());
    },

    async deleteHref(href) {
      await transport.request("DELETE", href, { expectStatus: [204, 404] });
    },
  };
}
