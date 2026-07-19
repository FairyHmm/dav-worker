import { NextcloudBase } from "../base.js";
import { calendarPath } from "./url.js";
import { lookupByUid } from "./uid-lookup.js";
import { timeRangeQueryBody, travelForQueryBody, parseReportResponses } from "./report.js";
import type { ComponentType, ReportEntry } from "./report.js";

const ICAL_CONTENT_TYPE = "text/calendar; charset=utf-8";

// CalDAVClient: list/create/update/delete/findByUid, implemented against the
// status-code contract settled in SPEC-SCHEDULES.md — no `If-Match` (writes
// are unconditional, last-write-wins), idempotent delete (404 = success),
// and UID-not-found is a plain `Error` with a clear message (same
// convention WebDAVClient uses for its own not-found cases), not a raw
// fetch error. `free`/free-busy is deliberately NOT here: SPEC-SCHEDULES.md's
// `nc_schedule_free` computes availability by inverting a time-range REPORT
// against the requested window, which is business logic that belongs in
// tools/schedule/, not in this transport-level client.
export class CalDAVClient extends NextcloudBase {
  private path(calendarName: string): string {
    return calendarPath(this.caldavBasePath(), calendarName);
  }

  async findByUid(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
  ): Promise<ReportEntry | null> {
    return lookupByUid(this, this.path(calendarName), componentType, uid);
  }

  async listByTimeRange(
    calendarName: string,
    componentType: ComponentType,
    startUtc: string,
    endUtc: string,
  ): Promise<ReportEntry[]> {
    const res = await this.request("REPORT", this.path(calendarName), {
      headers: { Depth: "1", "Content-Type": "application/xml" },
      body: timeRangeQueryBody(componentType, startUtc, endUtc),
      expectStatus: [207],
    });
    return parseReportResponses(await res.text());
  }

  async create(calendarName: string, uid: string, icsBody: string): Promise<void> {
    const href = `${this.path(calendarName)}${encodeURIComponent(uid)}.ics`;
    await this.request("PUT", href, {
      headers: { "Content-Type": ICAL_CONTENT_TYPE },
      body: icsBody,
      expectStatus: [201, 204],
    });
  }

  async update(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
    icsBody: string,
  ): Promise<void> {
    const entry = await this.findByUid(calendarName, componentType, uid);
    if (!entry) {
      throw new Error(`No ${componentType} found with id: ${uid}`);
    }
    await this.request("PUT", entry.href, {
      headers: { "Content-Type": ICAL_CONTENT_TYPE },
      body: icsBody,
      expectStatus: [201, 204],
    });
  }

  async delete(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
  ): Promise<void> {
    const entry = await this.findByUid(calendarName, componentType, uid);
    if (!entry) return; // idempotent per SPEC-SCHEDULES.md — already gone

    await this.request("DELETE", entry.href, {
      expectStatus: [204, 404],
    });
  }

  // Travel buffers (SPEC-SCHEDULES.md) are tagged with a custom
  // X-DAV-WORKER-TRAVEL-FOR property pointing at the parent event's UID,
  // always in the same calendar as the parent. Lookup and deletion are
  // both href-direct once found — no separate UID needed by the caller.
  async findTravelBuffersFor(
    calendarName: string,
    parentUid: string,
  ): Promise<ReportEntry[]> {
    const res = await this.request("REPORT", this.path(calendarName), {
      headers: { Depth: "1", "Content-Type": "application/xml" },
      body: travelForQueryBody(parentUid),
      expectStatus: [207],
    });
    return parseReportResponses(await res.text());
  }

  async deleteHref(href: string): Promise<void> {
    // Same idempotent contract as delete(): target already gone (404) is
    // treated as success, not an error.
    await this.request("DELETE", href, { expectStatus: [204, 404] });
  }
}

