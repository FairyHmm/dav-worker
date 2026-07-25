import type { FilesConfig } from "./files.js";
import { splitSegments, unescape, wildcardIndex } from "./path-segments.js";

// What a pattern's wildcard captured from the input, if it had one.
interface Capture {
  value: string;
}

export interface PatternMatch {
  replacement: string;
  capture?: Capture;
}

type MatchAttempt = { matched: false } | { matched: true; capture?: Capture };

// Does `patternKey` match the already-unescaped `inputSegments`? Segment
// counts must match exactly; at most one segment carries a wildcard, and
// its capture never crosses a `/` boundary (it comes from within a single
// input segment only).
function matchOne(patternKey: string, inputSegments: string[]): MatchAttempt {
  const patternSegments = splitSegments(patternKey);
  if (patternSegments.length !== inputSegments.length) {
    return { matched: false };
  }

  let capture: Capture | undefined;
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i]!;
    const inputSeg = inputSegments[i]!;
    const starIdx = wildcardIndex(patternSeg);

    if (starIdx === -1) {
      if (unescape(patternSeg) !== inputSeg) return { matched: false };
      continue;
    }

    const prefix = unescape(patternSeg.slice(0, starIdx));
    const suffix = unescape(patternSeg.slice(starIdx + 1));
    const longEnough = inputSeg.length >= prefix.length + suffix.length;
    if (
      !longEnough ||
      !inputSeg.startsWith(prefix) ||
      !inputSeg.endsWith(suffix)
    ) {
      return { matched: false };
    }

    capture = {
      value: inputSeg.slice(prefix.length, inputSeg.length - suffix.length),
    };
  }

  return { matched: true, capture };
}

// Literal patterns (no `*`) always beat wildcard patterns for the same
// input shape. Among multiple matches of the same kind, the last one
// defined in the TOML wins.
export function findMatchingPattern(config: FilesConfig, inputSegments: string[]): PatternMatch {
  const { patterns } = config;

  let literal: PatternMatch | undefined;
  let wildcard: PatternMatch | undefined;

  for (const [key, replacement] of Object.entries(patterns)) {
    const attempt = matchOne(key, inputSegments);
    if (!attempt.matched) continue;

    const isLiteralPattern = wildcardIndex(key) === -1;
    if (isLiteralPattern) literal = { replacement };
    else wildcard = { replacement, capture: attempt.capture };
  }

  const match = literal ?? wildcard;
  if (!match) {
    throw new Error(
      `No matching location pattern for: "${inputSegments.join("/")}"`,
    );
  }
  return match;
}

// A pattern's replacement template is written relative to `@projects`
// implicitly (no per-line `@projects/` prefix). Applying it substitutes
// the capture (if any) into the template's wildcard segment, then decides
// the root by looking at the *first* resulting segment — however it got
// there, whether from a captured wildcard or hardcoded in the template:
//   - Already starts with `@`: the author wrote an explicit alias root
//     themselves (e.g. `"journal/all" = "@vault/Personal/Journal"`).
//     Respected as-is. (Prepending `@projects` here would silently embed
//     an unexpanded `@alias` mid-path, past where `expandAliases` ever
//     looks — it only expands a *leading* `@`.)
//   - Names a known alias (hand-written or host-derived, e.g. a project
//     registered under `[hosts]`): that alias's own path *replaces* the
//     implicit root, rather than being prepended after it. Covers both
//     `dav-worker/spec` (wildcard capture "dav-worker") and a hardcoded
//     literal pattern like `"dav-worker/code" = "dav-worker/Code/..."`.
//   - Otherwise: prepend the implicit `@projects` root.
export function applyPattern(config: FilesConfig, match: PatternMatch): string {
  const templateSegments = splitSegments(match.replacement);
  const wildcardSegIdx = templateSegments.findIndex(
    (seg) => wildcardIndex(seg) !== -1,
  );

  const filledSegments =
    match.capture && wildcardSegIdx !== -1
      ? templateSegments.map((seg, i) =>
          i === wildcardSegIdx ? seg.replace("*", match.capture!.value) : seg,
        )
      : templateSegments;

  const first = filledSegments[0];
  if (first === undefined) return "@projects";

  if (first.startsWith("@")) {
    return filledSegments.join("/");
  }

  const { aliases } = config;
  if (aliases[first] !== undefined) {
    return [`@${first}`, ...filledSegments.slice(1)].join("/");
  }

  return ["@projects", ...filledSegments].join("/");
}
