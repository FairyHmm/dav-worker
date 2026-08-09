import { splitSegments, unescape } from "./path-segments.js";
import {
  findMatchingPattern,
  applyPattern,
  type PatternMatch,
} from "./pattern.js";
import { expandAliases } from "./alias.js";
import type { FilesConfig } from "../config/index.js";

// Pattern match → alias expansion. Throws if nothing matches or alias unknown.
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
    return expandAliases(
      config,
      ["@" + first, ...inputSegments.slice(1)].join("/"),
    );
  }

  throw new Error(
    `No matching location pattern for: "${inputSegments.join("/")}"`,
  );
}
