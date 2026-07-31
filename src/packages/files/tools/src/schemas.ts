import { z } from "zod";
import type { FileEntry } from "@dav-worker/files-contracts";

export const PathSchema = z
  .string()
  .describe("Vault-relative path (e.g. 'Documents/notes.md' or '')");

export const LocationSchema = z
  .string()
  .optional()
  .describe(
    "Named location shortcut, resolved into a vault-relative base path — " +
      "e.g. 'Nadir/spec' instead of the full underlying path. If `path` " +
      "is also given, it's joined onto this base (e.g. " +
      "location='Nadir/spec', path='draft.md' → 'draft.md' inside that " +
      "location). Unknown locations error rather than falling back to " +
      "`path`.",
  );

export const ModeSchema = z
  .enum(["replace", "append", "prepend"])
  .optional()
  .default("replace")
  .describe(
    "'replace' (default) overwrites the target (whole file, block, or " +
      "line range). 'append' adds after it, 'prepend' adds before it.",
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

// Inner shapes for TargetSchema below — kept un-exported since nothing
// outside the union needs a bare `from`/`to`/`block`/`scope` anymore; the
// union is the only public surface, so the mutual-exclusivity that used to
// be convention (four sibling optional fields) is now structural (two
// branches of a discriminated shape).
const BlockTargetSchema = z.object({
  block: z
    .string()
    .describe("Heading title to scope this operation to a specific section."),
  scope: z
    .enum(["body", "subtree"])
    .optional()
    .default("body")
    .describe(
      "'body' = content directly under the heading only; 'subtree' = the " +
        "heading plus everything nested under it. Default 'body'.",
    ),
});

const LineRangeTargetSchema = z.object({
  from: z
    .number()
    .int()
    .refine((v) => v !== 0, "must not be 0")
    .describe(
      "1-indexed line to start at (inclusive). Negative counts from the " +
        "end, Python-slice style (-1 = last line, -10 = 10th-from-last).",
    ),
  to: z
    .number()
    .int()
    .refine((v) => v !== 0, "must not be 0")
    .optional()
    .describe(
      "1-indexed line to end at (inclusive), same negative convention as " +
        "`from`. Omitted: targets that single `from` line, whether `from` " +
        "is positive or negative. To span to the end of the file, pass " +
        "`to: -1` explicitly (e.g. `from: -10, to: -1` for the last 10 " +
        "lines).",
    ),
});

export const TargetSchema = z
  .union([BlockTargetSchema, LineRangeTargetSchema])
  .optional()
  .describe(
    "What to target within the file: a markdown heading, a line range, " +
      "or (if omitted) the whole file.",
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
