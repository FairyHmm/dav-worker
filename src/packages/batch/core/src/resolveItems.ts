import type { z, ZodRawShape } from "zod";
import { getBatchFieldTags } from "./fieldTags.js";

export type ResolveItemsResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; error: string };

// required()/locked() tags live in a runtime registry (fieldTags.ts),
// not in the Zod schema's inferred type, so resolveItems can't narrow
// `Item` itself to mark required fields non-optional — the type system
// has no way to see which fields were tagged. RequiredKeys lets a tool
// spell that narrowing explicitly at the call site instead: pass the
// same field names given to required() in itemShape, and the return
// type drops `| undefined` for exactly those, matching what resolveItems
// actually guarantees at runtime after a successful resolve.
export type Resolved<Shape extends ZodRawShape, RequiredKeys extends keyof z.infer<z.ZodObject<Shape>>> =
	Omit<z.infer<z.ZodObject<Shape>>, RequiredKeys> &
		Required<Pick<z.infer<z.ZodObject<Shape>>, RequiredKeys>>;

/**
 * Resolves a batch's items against top-level defaults, per SPEC-BATCH.md:
 * whole-value replace, no merging. An item's own field wins if present;
 * otherwise the matching top-level value fills in.
 *
 * Takes the tool's actual itemShape (the same object passed to
 * withBatchSupport) rather than a derived key list, so it can read each
 * field's required()/locked() tags (see fieldTags.ts) and enforce them
 * uniformly instead of leaving that to per-tool hand-written checks:
 *
 * - required() fields: rejected if still empty after fill-in. Catches a
 *   tool forgetting its own "is this field present" guard before writing
 *   — the shape itself is the check, so there's nothing to forget.
 * - locked() fields: rejected if any individual item sets its own value
 *   in a multi-item batch (top-level default is fine and expected).
 *   Prevents a batch silently fanning writes out across different
 *   targets (e.g. `list`) the caller never separately confirmed.
 *
 * Returns a result object rather than throwing — callers are inside an
 * MCP tool handler and want to `err()` a clean message, not catch.
 */
export function resolveItems<
	Shape extends ZodRawShape,
	RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
>(
	items: Partial<z.infer<z.ZodObject<Shape>>>[] | undefined,
	defaults: Record<string, unknown>,
	itemShape: Shape,
): ResolveItemsResult<Resolved<Shape, RequiredKeys>> {
	type Item = z.infer<z.ZodObject<Shape>>;
	const keys = Object.keys(itemShape) as (keyof Shape & string)[];
	const isBatch = !!items && items.length > 1;
	const source: Partial<Item>[] = items && items.length > 0 ? items : [defaults as Partial<Item>];

	const resolved: Item[] = [];

	for (let i = 0; i < source.length; i++) {
		const raw = source[i] as Record<string, unknown>;
		const out: Record<string, unknown> = { ...raw };

		for (const key of keys) {
			const tags = getBatchFieldTags(itemShape[key]);

			if (tags.locked && isBatch && raw[key] !== undefined) {
				return {
					ok: false,
					error:
						`Field "${key}" can't be set per-item in a batch — it's shared ` +
						`across all items. Set it at the top level instead, or run ` +
						`separate calls if items genuinely need different values.`,
				};
			}

			if (out[key] === undefined && defaults[key] !== undefined) {
				out[key] = defaults[key];
			}

			if (tags.required && (out[key] === undefined || out[key] === "")) {
				const where = isBatch ? ` (item ${i + 1})` : "";
				return { ok: false, error: `Field "${key}" is required${where}.` };
			}
		}

		resolved.push(out as Item);
	}

	// Runtime already enforced required()/locked() above; this cast is
	// what actually applies the narrowing RequiredKeys asked for — the
	// loop's own Item type is deliberately still `| undefined` per field
	// since that's what the raw resolution produces before validation.
	return { ok: true, items: resolved as Resolved<Shape, RequiredKeys>[] };
}
