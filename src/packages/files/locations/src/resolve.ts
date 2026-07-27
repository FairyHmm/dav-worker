import { splitSegments, unescape } from "./path-segments.js";
import { findMatchingPattern, applyPattern, type PatternMatch } from "./pattern.js";
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
 * Patterns take precedence over a bare alias with the same name — e.g.
 * "dav-worker/code" hits the wildcard "code" pattern (→ .../Code, not a
 * literal "code" segment), even though "dav-worker" alone is also a known
 * alias.
 * Only once no pattern matches at all does a whole-input alias name (e.g.
 * "dav-worker" alone, or "dav-worker/extra" with no matching pattern for
 * that shape) get resolved directly against [aliases]/[hosts], instead of
 * unconditionally erroring — this is what lets a bare alias work as a
 * `location` on its own, not just as an embedded root inside some other
 * pattern's template (see applyPattern).
 * Throws if neither a pattern nor a whole-input alias matches, an alias
 * is unknown, or expansion cycles.
 */
export function resolveLocation(config: FilesConfig, input: string): string {
  const inputSegments = splitSegments(input).map(unescape);

  let match: PatternMatch | undefined;
  try {
    match = findMatchingPattern(config, inputSegments);
  } catch {
    match = undefined;
  }

  if (match) {
    const symbolic = applyPattern(config, match);
    return expandAliases(config, symbolic);
  }

  const first = inputSegments[0];
  if (first !== undefined && config.aliases[first] !== undefined) {
    return expandAliases(config, ["@" + first, ...inputSegments.slice(1)].join("/"));
  }

  throw new Error(`No matching location pattern for: "${inputSegments.join("/")}"`);
}
