import { davPath, davUrl } from "../webdav/url.js";

// Calendar-relative path building reuses davPath()/davUrl()'s per-segment
// encoding — the escaping rules (encode each segment, not the whole string)
// are identical to WebDAV; only the base path differs
// (calendars/{user}/{calendar}/ vs files/{user}/...). A trailing slash is
// appended because calendar collections are always addressed as collections
// (REPORT with Depth: 1 expects it).

export function calendarPath(
  calendarBasePath: string,
  calendarName: string,
): string {
  return `${davPath(calendarBasePath, calendarName)}/`;
}

export function calendarDavUrl(
  host: string,
  calendarBasePath: string,
  calendarName: string,
): string {
  return `${davUrl(host, calendarBasePath, calendarName)}/`;
}
