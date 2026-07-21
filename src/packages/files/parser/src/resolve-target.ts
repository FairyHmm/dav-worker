import { handlers, type FormatHandler, type MarkdownAddress } from "./registry.js";
import type { RawAddress } from "./raw/index.js";

interface ResolveInput {
  block?: string;
  scope?: "body" | "subtree";
  from?: number;
  to?: number;
}

// Per SPEC-PARSER.md: block vs from/to vs whole-file, block and from/to are
// mutually exclusive. Lives alongside registry.ts rather than in the tool
// layer — this is "given handlers, decide how to dispatch to them," which is
// parser-side routing logic, not a tools/ concern. Keeping it here also means
// a future split into separate packages (parser vs tools) doesn't have to
// drag tool-layer code into the parser package just to route.
//
// registry.ts itself stays a pure lookup table with no dispatch logic, per
// its own comment — this file is the dispatch, kept separate on purpose.
//
// Carries handler+address per branch (rather than just a kind tag) so call
// sites can go straight to `target.handler.read/write(...)` with a switch
// for narrowing, instead of re-deriving which handler to use.
export type Target =
  | { kind: "markdown"; handler: FormatHandler<MarkdownAddress>; address: MarkdownAddress }
  | { kind: "raw"; handler: FormatHandler<RawAddress>; address: RawAddress }
  | { kind: "whole-file" };

export function resolveTarget(input: ResolveInput): Target {
  if (input.block !== undefined && input.from !== undefined) {
    throw new Error("`block` and `from`/`to` are mutually exclusive.");
  }
  if (input.block !== undefined) {
    return {
      kind: "markdown",
      handler: handlers.markdown,
      address: { heading: input.block, scope: input.scope ?? "body" },
    };
  }
  if (input.from !== undefined) {
    return {
      kind: "raw",
      handler: handlers.raw,
      address: { from: input.from, to: input.to },
    };
  }
  return { kind: "whole-file" };
}
