import type { ErrorMode } from "./errorMode.js";

// Minimal shape every package's own ok()/err() helper already satisfies
// (see e.g. tasks/tools/src/utils.ts): an MCP tool result always carries
// `content`, and err() additionally sets `isError`. Not importing a
// concrete result type keeps this package independent per
// SPEC-MONOREPO.md A.7 — this is a structural shape, not a shared type.
type BatchResult = { content: unknown[]; isError?: boolean };

/**
 * Runs `fn` over `items`, per SPEC-BATCH.md Appendix A.
 *
 * - "continue" (default): best-effort. Every item runs regardless of
 *   earlier failures; the returned array is always `items.length` long,
 *   positionally matched.
 * - "stop": fail-fast. Runs items in order, stops at the first result
 *   with `isError`, and returns only the results produced so far
 *   (successes-so-far + the failing item) — remaining items are not run.
 *
 * Both modes await each item before starting the next, so "stop" can
 * actually observe a failure before later items fire. "continue" could
 * run concurrently instead, but sequential keeps the two modes' timing
 * behavior consistent and easy to reason about; callers with large
 * batches and no ordering concerns can still Promise.all their own items
 * before calling in with pre-resolved values if they want fan-out.
 */
export async function runBatch<TItem, TResult extends BatchResult>(
	items: TItem[],
	fn: (item: TItem) => Promise<TResult>,
	mode: ErrorMode = "continue",
): Promise<TResult[]> {
	const results: TResult[] = [];

	for (const item of items) {
		const result = await fn(item);
		results.push(result);

		if (mode === "stop" && result.isError) {
			break;
		}
	}

	return results;
}
