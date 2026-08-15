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
  // For a slashless path, lastIndexOf("/") is -1, and slice(0, -1) would
  // truncate the last character instead of yielding "" — guard on idx > 0.
  const idx = path.lastIndexOf("/");
  const dir = idx > 0 ? path.slice(0, idx) : "";
  if (dir) await fileStorage.mkdir(dir);
}

// Consumers that only need { read, write } (e.g. config/tools's
// ConfigStorage) shouldn't have to know write() needs a preceding mkdir.
export function withParentDirWrite<
  T extends {
    read(path: string): Promise<{ content: string }>;
    write(path: string, content: string): Promise<unknown>;
    mkdir(path: string): Promise<unknown>;
  },
>(storage: T): { read: T["read"]; write: T["write"] } {
  return {
    read: storage.read.bind(storage),
    write: async (path, content) => {
      await ensureParentDir(path, storage);
      return storage.write(path, content);
    },
  };
}
