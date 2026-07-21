import { davPath, davUrl } from "@dav-worker/clients-webdav";

export function calendarPath(calendarBasePath: string, calendarName: string): string {
  return `${davPath(calendarBasePath, calendarName)}/`;
}

export function calendarDavUrl(
  host: string,
  calendarBasePath: string,
  calendarName: string,
): string {
  return `${davUrl(host, calendarBasePath, calendarName)}/`;
}
