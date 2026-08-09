import type { ZodRawShape, z } from "zod";
import type { ErrorMode } from "./errorMode.js";
import type { BatchResult } from "./types.js";
import { resolveItems, type Resolved } from "./resolveItems.js";
import { runBatch } from "./runBatch.js";

export interface RunBatchToolParams<Shape extends ZodRawShape> {
  items: Partial<z.infer<z.ZodObject<Shape>>>[] | undefined;
  on_error?: ErrorMode;
}

// Owns resolve/validate/run/shape so tool files only supply per-item
// logic and err() (ok/err stay per-package per A.7).

// Stateless: no `options`, fn returns TResult directly.
export async function runBatchTool<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
  TResult extends BatchResult = BatchResult,
>(
  params: RunBatchToolParams<Shape> & Record<string, unknown>,
  itemShape: Shape,
  err: (e: unknown) => TResult,
  fn: (item: Resolved<Shape, RequiredKeys>) => Promise<TResult>,
): Promise<TResult>;
// Stateful: `options` present, fn reports its own next state.
export async function runBatchTool<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
  TResult extends BatchResult = BatchResult,
  TState = undefined,
>(
  params: RunBatchToolParams<Shape> & Record<string, unknown>,
  itemShape: Shape,
  err: (e: unknown) => TResult,
  fn: (
    item: Resolved<Shape, RequiredKeys>,
    state: TState,
  ) => Promise<{ result: TResult; state: TState }>,
  options: { initial: TState; didApply: (result: TResult) => boolean },
): Promise<TResult>;
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

  // Overloads guarantee fn matches `options`'s presence; the implementation
  // signature can't express that, so one cast here replaces two at each call site.
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
