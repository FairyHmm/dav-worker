// Barrel export for the generic WebDAV protocol package. Protocol-scoped,
// not domain-scoped (SPEC-MONOREPO.md A.2) — nothing here knows about
// Nextcloud, calendars, or files-as-a-domain-concept.

export { createWebDAVTransport, WebDAVHttpError } from "./transport.js";
export type { WebDAVTransport, WebDAVRequestInit } from "./transport.js";

export { davPath, davUrl } from "./url.js";

export {
  PROPFIND_BODY,
  xmlParser,
  isCollection,
  mergedProps,
  propOrNull,
  decodeMissedNumericEntities,
} from "./xml.js";
