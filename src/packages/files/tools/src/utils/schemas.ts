import { z } from "zod";
import type { FileEntry } from "@dav-worker/files-contracts";

export const PathSchema = z
  .string()
  .describe("Vault-relative path (e.g. 'Documents/notes.md' or '')");

export const LocationSchema = z
  .string()
  .optional()
  .describe(
    "Named shortcut resolved to a base path. `path`, if given, is joined onto it. " +
      "Unknown locations error.",
  );

export const ModeSchema = z
  .enum(["replace", "append", "prepend"])
  .optional()
  .default("replace")
  .describe(
    "'replace' (default) overwrites the target; 'append'/'prepend' add around it.",
  );

export const DepthSchema = z
  .number()
  .optional()
  .default(1)
  // Collapse any negative to -1 (WebDAVClient's "infinity") so callers
  // don't need to know the exact sentinel value.
  .transform((v) => (v < 0 ? -1 : Math.round(v)))
  .describe(
    "How many levels deep to list. Default 1 (immediate children). Negative = full " +
      "recursive tree — expensive on large trees, prefer an explicit depth.",
  );

const BlockTargetSchema = z.object({
  block: z.string().describe("Heading title to scope to."),
  scope: z
    .enum(["body", "subtree"])
    .optional()
    .default("body")
    .describe(
      "'body' = directly under the heading; 'subtree' = heading plus nested content.",
    ),
});

const LineRangeTargetSchema = z.object({
  from: z
    .number()
    .int()
    .refine((v) => v !== 0, "must not be 0")
    .describe(
      "1-indexed start line, inclusive. Negative counts from the end (-1 = last line).",
    ),
  to: z
    .number()
    .int()
    .refine((v) => v !== 0, "must not be 0")
    .optional()
    .describe(
      "1-indexed end line, inclusive. Negative counts from the end (-1 = last line). " +
        "Omitted: targets a single line.",
    ),
});

export const TargetSchema = z
  .union([BlockTargetSchema, LineRangeTargetSchema])
  .optional()
  .describe(
    "What to target: a heading, a line range, or (omitted) the whole file.",
  );

export const ForceSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe(
    "Overwrite an existing destination. If false and it exists, the operation is " +
      "refused and its metadata is returned instead.",
  );

export function formatConflict(meta: FileEntry, callAgainWith: string): string {
  return (
    `Conflict: destination already exists.\n` +
    JSON.stringify(meta, null, 2) +
    `\n\nCall again with ${callAgainWith} to overwrite, or choose a different destination.`
  );
}
