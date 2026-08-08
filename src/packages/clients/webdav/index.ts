// Protocol-scoped only (SPEC-MONOREPO.md A.2) — no Nextcloud/domain knowledge.
export { createWebDAVTransport, WebDAVHttpError } from "./src/transport.js";
export type { WebDAVTransport, WebDAVRequestInit } from "./src/transport.js";

export { davPath, davUrl } from "./src/url.js";

export {
  PROPFIND_BODY,
  xmlParser,
  isCollection,
  mergedProps,
  propOrNull,
  decodeMissedNumericEntities,
} from "./src/xml.js";
