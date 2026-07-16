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
