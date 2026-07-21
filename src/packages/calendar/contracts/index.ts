// CalendarStorage is the contract `calendar/tools/*` codes against —
// implemented by `storage/nextcloud/caldav.ts` today. Mirrors the existing
// CalDAVClient surface (src/clients/caldav/index.ts): list/create/update/
// delete/findByUid against the status-code contract settled in
// SPEC-SCHEDULES.md (unconditional writes, idempotent delete, UID-not-found
// as a plain Error). `free`/free-busy stays out of this contract on
// purpose — it's business logic (inverting a time-range query against a
// window) that belongs in `calendar/tools/`, not the storage layer.

export type ComponentType = "VEVENT" | "VTODO";

export interface ReportEntry {
  href: string;
  etag: string | null;
  calendarData: string | null;
}

export interface CalendarStorage {
  findByUid(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
  ): Promise<ReportEntry | null>;

  listByTimeRange(
    calendarName: string,
    componentType: ComponentType,
    startUtc: string,
    endUtc: string,
  ): Promise<ReportEntry[]>;

  create(calendarName: string, uid: string, icsBody: string): Promise<void>;

  update(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
    icsBody: string,
  ): Promise<void>;

  delete(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
  ): Promise<void>;

  // Travel buffers (SPEC-SCHEDULES.md) are tagged with a custom
  // X-DAV-WORKER-TRAVEL-FOR property pointing at the parent event's UID.
  findTravelBuffersFor(
    calendarName: string,
    parentUid: string,
  ): Promise<ReportEntry[]>;

  deleteHref(href: string): Promise<void>;
}
