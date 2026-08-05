import type { ZodRawShape, z } from "zod";
import type { ErrorMode } from "./errorMode.js";
import { resolveItems, type Resolved } from "./resolveItems.js";
import { runBatch } from "./runBatch.js";

// Duplicated, not imported, per SPEC-MONOREPO.md A.7.
type BatchResult = { content: unknown[]; isError?: boolean };

export interface RunBatchToolParams<Shape extends ZodRawShape> {
  items: Partial<z.infer<z.ZodObject<Shape>>>[] | undefined;
  on_error?: ErrorMode;
}

// Owns resolve/validate/run/shape so tool files only supply per-item
// logic and err() (ok/err stay per-package per A.7). fn keeps a plain
// (item) => TResult overload for the common no-state case — normalized
// below into runBatch's single (item, state) => { result, state } shape.
export async function runBatchTool<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
  TResult extends BatchResult = BatchResult,
  TState = undefined,
>(
  params: RunBatchToolParams<Shape> & Record<string, unknown>,
  itemShape: Shape,
  err: (e: unknown) => TResult,
  fn:
    | ((item: Resolved<Shape, RequiredKeys>) => Promise<TResult>)
    | ((
        item: Resolved<Shape, RequiredKeys>,
        state: TState,
      ) => Promise<{ result: TResult; state: TState }>),
  options?: { initial: TState; didApply: (result: TResult) => boolean },
): Promise<TResult> {
  const resolved = resolveItems<Shape, RequiredKeys>(
    params.items,
    params,
    itemShape,
  );
  if (!resolved.ok) return err(new Error(resolved.error));

  const withState = options
    ? (fn as (
        item: Resolved<Shape, RequiredKeys>,
        state: TState,
      ) => Promise<{ result: TResult; state: TState }>)
    : async (item: Resolved<Shape, RequiredKeys>, state: TState) => ({
        result: await (
          fn as (item: Resolved<Shape, RequiredKeys>) => Promise<TResult>
        )(item),
        state,
      });

  const results = await runBatch(
    resolved.items,
    withState,
    params.on_error ?? "continue",
    options,
  );

  // No `items`: single result, unchanged shape.
  if (!params.items) return results[0];

  return { content: results.flatMap((r) => r.content) } as TResult;
}
