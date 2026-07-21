import { splitSegments, unescape } from "./path-segments.js";
import { findMatchingPattern, applyPattern } from "./pattern.js";
import { expandAliases } from "./alias.js";

/**
 * Resolve a named location (Docs/SPEC-LOCATIONS.md) into a concrete
 * vault-relative filesystem path:
 *   1. [hosts] is expanded into synthetic aliases at config-load time.
 *   2. Find the matching pattern (segment-count exact match; literal beats
 *      wildcard; last-defined wins among equal specificity).
 *   3. Apply the pattern once — implicit `@projects` prefix, or a host's
 *      own path when the wildcard capture names a known alias.
 *   4. Expand all `@aliases` recursively (depth-capped, no cycle graph).
 * Throws if no pattern matches, an alias is unknown, or expansion cycles.
 */
export function resolveLocation(input: string): string {
  const inputSegments = splitSegments(input).map(unescape);
  const match = findMatchingPattern(inputSegments);
  const symbolic = applyPattern(match);
  return expandAliases(symbolic);
}
