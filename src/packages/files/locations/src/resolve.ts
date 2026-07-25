import { splitSegments, unescape } from "./path-segments.js";
import { findMatchingPattern, applyPattern } from "./pattern.js";
import { expandAliases } from "./alias.js";
import type { FilesConfig } from "./files.js";

/**
 * Resolve a named location (Docs/SPEC-LOCATIONS.md) into a concrete
 * vault-relative filesystem path, against a session's own FilesConfig
 * (fetched per-request from that user's configured Nextcloud path — see
 * TODO-MONOREPO 9e; no bundled/module-level config anymore):
 *   1. [hosts] is expanded into synthetic aliases at config-load time.
 *   2. Find the matching pattern (segment-count exact match; literal beats
 *      wildcard; last-defined wins among equal specificity).
 *   3. Apply the pattern once — implicit `@projects` prefix, or a host's
 *      own path when the wildcard capture names a known alias.
 *   4. Expand all `@aliases` recursively (depth-capped, no cycle graph).
 * Throws if no pattern matches, an alias is unknown, or expansion cycles.
 */
export function resolveLocation(config: FilesConfig, input: string): string {
  const inputSegments = splitSegments(input).map(unescape);
  const match = findMatchingPattern(config, inputSegments);
  const symbolic = applyPattern(config, match);
  return expandAliases(config, symbolic);
}
