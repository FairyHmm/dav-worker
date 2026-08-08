// Storage contract for calendar tools. Mirrors CalDAVClient surface.
// Free/busy stays out — that's business logic in calendar/tools.

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

  // Travel buffers are tagged with X-DAV-WORKER-TRAVEL-FOR pointing at parent UID.
  findTravelBuffersFor(
    calendarName: string,
    parentUid: string,
  ): Promise<ReportEntry[]>;

  deleteHref(href: string): Promise<void>;
}
