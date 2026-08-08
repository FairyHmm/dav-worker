import { z, type ZodRawShape } from "zod";
import { ErrorModeSchema } from "./errorMode.js";
import { getBatchFieldTags } from "./fieldTags.js";

// Descriptions stay generic — itemShape's own fields already carry
// their own .describe(), so this only explains items/on_error.
export function withBatchSupport<Shape extends ZodRawShape>(itemShape: Shape) {
  // Surfaced up front so the calling LLM sees the constraint before
  // hitting a resolveItems rejection, not after.
  const lockedFields = Object.entries(itemShape)
    .filter(([, schema]) => getBatchFieldTags(schema).locked)
    .map(([key]) => key);
  const lockedNote =
    lockedFields.length > 0
      ? ` Fields ${lockedFields.map((f) => `\`${f}\``).join(", ")} are shared ` +
        "across all items and can only be set at the top level, not per-item."
      : "";

  return {
    items: z
      .array(z.object(itemShape))
      .optional()
      .describe(
        "Run this tool for multiple items in one call. Each entry may " +
          "set any field; an omitted field falls back to the matching " +
          "top-level value (whole-value replace, not merged)." +
          lockedNote,
      ),
    on_error: ErrorModeSchema.describe(
      "'continue' (default): run every item regardless of earlier " +
        "failures. 'stop': stop at the first failed item and return only " +
        "the results produced so far. Ignored when `items` is omitted.",
    ),
  };
}
