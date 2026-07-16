import { z } from "zod";
import type { FileEntry } from "../../clients/webdav.js";

export const PathSchema = z
  .string()
  .describe("Vault-relative path (e.g. 'Documents/notes.md' or '')");

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
  .int()
  .optional()
  .default(1)
  .describe(
    "How many levels deep to list. Default 1 (immediate children only). " +
      "-1 = full recursive tree (Depth: infinity). Use -1 only when the directory " +
      "structure is completely unknown — it is expensive on large or deeply " +
      "nested directories and can hit Worker CPU limits. Prefer an explicit depth.",
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
