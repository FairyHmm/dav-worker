import type { FilesConfig } from "../config/index.js";
import { splitSegments, unescape, wildcardIndex } from "./path-segments.js";

// Wildcard capture from input.
interface Capture {
  value: string;
}

export interface PatternMatch {
  replacement: string;
  capture?: Capture;
}

type MatchAttempt = { matched: false } | { matched: true; capture?: Capture };

// Exact segment count match; one wildcard per segment max.
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

// Literals beat wildcards; last-defined wins.
export function findMatchingPattern(
  config: FilesConfig,
  inputSegments: string[],
): PatternMatch {
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

// Template resolves relative to @projects; first segment decides root.
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
