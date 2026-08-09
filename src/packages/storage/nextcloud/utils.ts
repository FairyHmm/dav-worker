// Shared Nextcloud CalDAV utilities.
// Consolidates duplicated constants and transport initialization.

import type { Credential } from "@dav-worker/auth-upstream";
import { createWebDAVTransport } from "@dav-worker/clients-webdav";
import { asNextcloudCredential, basicAuthHeader } from "./credential.js";

// Content type for iCalendar data.
export const ICAL_CONTENT_TYPE = "text/calendar; charset=utf-8";

// Build the CalDAV base path for a user's calendars.
export function calDAVBasePath(username: string): string {
  return `/remote.php/dav/calendars/${username}`;
}

// Create a WebDAV transport from a credential.
export function createNextcloudTransport(credential: Credential) {
  const cred = asNextcloudCredential(credential);
  return {
    transport: createWebDAVTransport(cred.host, basicAuthHeader(cred)),
    cred,
  };
}

// Ensure the parent directory of a path exists, creating it if necessary.
export async function ensureParentDir(
  path: string,
  fileStorage: { mkdir(path: string): Promise<unknown> },
): Promise<void> {
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (dir) await fileStorage.mkdir(dir);
}
