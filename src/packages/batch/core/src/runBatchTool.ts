import type { ZodRawShape, z } from "zod";
import type { ErrorMode } from "./errorMode.js";
import { resolveItems, type Resolved } from "./resolveItems.js";
import { runBatch } from "./runBatch.js";

// Same structural shape as runBatch.ts's BatchResult — kept separate
// (not imported) since the two files can each stand alone; duplicating
// a 1-line type is cheaper than adding an internal cross-file coupling
// for something this small.
type BatchResult = { content: unknown[]; isError?: boolean };

export interface RunBatchToolParams<Shape extends ZodRawShape> {
	items: Partial<z.infer<z.ZodObject<Shape>>>[] | undefined;
	on_error?: ErrorMode;
}

/**
 * Owns the whole batch pipeline a tool handler needs — resolve, validate,
 * run, shape the final MCP result — so tool files only supply the
 * per-item logic and their own err() (per SPEC-MONOREPO.md A.7, ok/err
 * stay per-package; this takes err as a parameter instead of importing
 * one). Every batchable tool was repeating this same ~15-line shape
 * around resolveItems/runBatch; consolidating it here means a tool file
 * only imports withBatchSupport + runBatchTool, not five separate
 * batch-core exports each time.
 *
 * `params` is whatever the MCP handler received — itemShape's own
 * fields plus `items`/`on_error` from withBatchSupport. Only `items`/
 * `on_error` are read here; the rest passes through to resolveItems as
 * defaults, same as a tool calling resolveItems directly would.
 */
export async function runBatchTool<
	Shape extends ZodRawShape,
	RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
	TResult extends BatchResult = BatchResult,
>(
	params: RunBatchToolParams<Shape> & Record<string, unknown>,
	itemShape: Shape,
	err: (e: unknown) => TResult,
	fn: (item: Resolved<Shape, RequiredKeys>) => Promise<TResult>,
): Promise<TResult> {
	const resolved = resolveItems<Shape, RequiredKeys>(params.items, params, itemShape);
	if (!resolved.ok) return err(new Error(resolved.error));

	const results = await runBatch(resolved.items, fn, params.on_error ?? "continue");

	// No `items` given: return the single result, unchanged shape.
	if (!params.items) return results[0];

	// Batched: flat, positional per SPEC-BATCH.md. isError stays unset at
	// the envelope level — failures show up per-item in that item's own
	// "Error: ..." text block.
	return { content: results.flatMap((r) => r.content) } as TResult;
}
