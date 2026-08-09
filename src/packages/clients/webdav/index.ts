// Protocol-scoped only (SPEC-MONOREPO.md A.2) — no Nextcloud/domain knowledge.
export { createWebDAVTransport, WebDAVHttpError } from "./src/transport";
export type { WebDAVTransport, WebDAVRequestInit } from "./src/transport";

export { davPath, davUrl } from "./src/url";

export {
  PROPFIND_BODY,
  xmlParser,
  isCollection,
  mergedProps,
  propOrNull,
  decodeMissedNumericEntities,
  parseResponses,
} from "./src/xml";
export type { ParsedResponse } from "./src/xml";
