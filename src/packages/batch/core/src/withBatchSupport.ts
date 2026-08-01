import { z, type ZodRawShape } from "zod";
import { ErrorModeSchema } from "./errorMode.js";
import { getBatchFieldTags } from "./fieldTags.js";

/**
 * Given a tool's own item shape (its normal single-item params, each
 * `.optional()` so an item can omit a field and inherit the top-level
 * value), returns the two extra fields every batchable tool needs:
 * `items` and `on_error`. Spread this alongside the tool's own
 * top-level params — see SPEC-BATCH.md.
 *
 * Descriptions are deliberately generic and short: each field in
 * `itemShape` already carries its own `.describe()`, so this doesn't
 * re-explain what those fields mean — only what `items`/`on_error` do.
 */
export function withBatchSupport<Shape extends ZodRawShape>(itemShape: Shape) {
	// Surface locked() fields in the generated description so the calling
	// LLM sees the constraint up front, rather than only discovering it
	// from a resolveItems rejection after the fact.
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
