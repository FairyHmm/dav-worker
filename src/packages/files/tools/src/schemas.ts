import { z } from "zod";
import type { FileEntry } from "@dav-worker/files-contracts";

export const PathSchema = z
  .string()
  .describe("Vault-relative path (e.g. 'Documents/notes.md' or '')");

export const LocationSchema = z
  .string()
  .optional()
  .describe(
    "Named location shortcut (see Docs/SPEC-LOCATIONS.md), resolved via " +
      "the aliases/patterns config into a vault-relative base path — e.g. " +
      "'Nadir/spec' instead of the full underlying path. If `path` is also " +
      "given, it's joined onto this base as a relative addition (e.g. " +
      "location='Nadir/spec', path='draft.md' targets 'draft.md' inside " +
      "that location). Unknown/unmatched locations return a clear error " +
      "rather than falling back to `path`.",
  );

export const BlockSchema = z
  .string()
  .optional()
  .describe(
    "Heading title to scope this operation to a specific section. " +
      "Omit to operate on the whole file.",
  );

export const ScopeSchema = z
  .enum(["body", "subtree"])
  .optional()
  .default("body")
  .describe(
    "Only used with `block`. 'body' = just the content directly under the " +
      "heading, before any subheadings. 'subtree' = the heading line itself " +
      "plus all nested content and subheadings. Default: 'body'.",
  );

export const ModeSchema = z
  .enum(["replace", "append"])
  .optional()
  .default("replace")
  .describe(
    "Only used with `block`. 'replace' overwrites the scoped section, " +
      "'append' adds after it. Default: 'replace'.",
  );

export const DepthSchema = z
  .number()
  .optional()
  .default(1)
  // Round instead of rejecting non-integers, and collapse any negative
  // value to -1 (WebDAVClient treats anything < 0 as "infinity") rather
  // than requiring the caller to pass exactly -1.
  .transform((v) => (v < 0 ? -1 : Math.round(v)))
  .describe(
    "How many levels deep to list. Default 1 (immediate children only). " +
      "Any negative value = full recursive tree (Depth: infinity). Use this only " +
      "when the directory structure is completely unknown — it is expensive on " +
      "large or deeply nested directories and can hit Worker CPU limits. Prefer " +
      "an explicit depth.",
  );

export const FromSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe(
    "Raw target: 1-indexed line to start at (inclusive). Mutually exclusive " +
      "with `block`. Omit `to` to target a single line.",
  );

export const ToSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe(
    "Raw target: 1-indexed line to end at (inclusive). Only used together " +
      "with `from`.",
  );

export const ForceSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe("Overwrite destination if it exists (default: false)");

export function formatConflict(meta: FileEntry, callAgainWith: string): string {
  return (
    `Conflict: destination already exists.\n` +
    JSON.stringify(meta, null, 2) +
    `\n\nCall again with ${callAgainWith} to overwrite, or choose a different destination.`
  );
}
