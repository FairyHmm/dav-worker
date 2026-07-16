import { z } from "zod";
import type { FileEntry } from "../../clients/webdav.js";

export const PathSchema = z
  .string()
  .describe("Vault-relative path (e.g. 'Documents/notes.md' or '')");

export const BlockSchema = z
  .string()
  .optional()
  .describe(
    "Heading title to read as a scoped block (that heading plus all its " +
      "nested content and subheadings). Omit to read the whole file.",
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
