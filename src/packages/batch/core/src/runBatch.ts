import type { ErrorMode } from "./errorMode.js";

// Structural, not imported, per SPEC-MONOREPO.md A.7.
type BatchResult = { content: unknown[]; isError?: boolean };

// fn always reports its own next state (TState defaults to undefined for
// stateless callers) so the loop stays one shape, not a stateful/stateless branch.
export async function runBatch<
  TItem,
  TResult extends BatchResult,
  TState = undefined,
>(
  items: TItem[],
  fn: (
    item: TItem,
    state: TState,
  ) => Promise<{ result: TResult; state: TState }>,
  mode: ErrorMode = "continue",
  options?: {
    initial: TState;
    // Skip advancing on failure, so a failed item can't mis-shift a
    // position-sensitive target (e.g. line ranges) that later items see.
    didApply: (result: TResult) => boolean;
  },
): Promise<TResult[]> {
  const results: TResult[] = [];
  let current = (options?.initial ?? undefined) as TState;

  for (const item of items) {
    const { result, state } = await fn(item, current);
    if (!options || options.didApply(result)) {
      current = state;
    }

    results.push(result);

    if (mode === "stop" && result.isError) {
      break;
    }
  }

  return results;
}
