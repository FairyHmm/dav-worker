export { createNextcloudWebDAVStorage } from "./webdav.js";
export { createNextcloudCalDAVStorage } from "./caldav/index.js";
export { createNextcloudCalDAVTaskStorage } from "./caldav/tasks.js";
export type { NextcloudCredential } from "./credential.js";
// Re-exported (not wrapped in a storage-nextcloud-specific type) so callers
// like app/worker can distinguish auth failures (401) from other storage
// errors without a direct dependency on @dav-worker/clients-webdav, which
// isn't in their declared package.json deps.
export { WebDAVHttpError } from "@dav-worker/clients-webdav";
export {
  ICAL_CONTENT_TYPE,
  calDAVBasePath,
  createNextcloudTransport,
  ensureParentDir,
  withParentDirWrite,
} from "./utils.js";
