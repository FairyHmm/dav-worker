import { handlers, type MarkdownAddress } from "./registry.js";
import type { RawAddress } from "./raw/index.js";
import type { WriteMode } from "./markdown/index.js";

type ResolveInput =
  | { block: string; scope?: "body" | "subtree"; from?: undefined; to?: undefined }
  | { from: number; to?: number; block?: undefined; scope?: undefined }
  | { block?: undefined; scope?: undefined; from?: undefined; to?: undefined };

// Per SPEC-PARSER.md: block vs from/to vs whole-file. Mirrors the tool-layer
// TargetSchema union one-to-one (block+scope | from+to | omitted entirely),
// so mutual exclusivity is structural here too — there's no longer a branch
// that checks for both `block` and `from` being set, since the type doesn't
// allow it. Lives alongside registry.ts rather than in the tool layer —
// this is "given handlers, decide how to dispatch to them," which is
// parser-side routing logic, not a tools/ concern. Keeping it here also means
// a future split into separate packages (parser vs tools) doesn't have to
// drag tool-layer code into the parser package just to route.
//
// registry.ts itself stays a pure lookup table with no dispatch logic, per
// its own comment — this file is the dispatch, kept separate on purpose.
//
// Carries a bound `read`/`write` pair (closing over the matching
// handler+address, rather than exposing them separately) so call sites
// never have to line up a handler with its own address type themselves —
// after narrowing away `whole-file`, `target.read(source)`/
// `target.write(source, content, mode)` just work, no per-kind switch
// needed at the call site. This is also what makes `notFoundError`/
// `describe` safe to read from a merged `markdown | raw` type without a
// `handler`/`address` type-mismatch: nothing outside this file ever needs
// to pair them up.
//
// `notFoundError` is the message for "this address doesn't exist in the
// file" (missing heading, out-of-bounds line range) — computed here, once,
// from the same inputs that built the address, rather than re-derived at
// each call site from `block`/`from`/`to` closed over from the outer scope.
// Both file_read and file_write hit this same "handler returned undefined"
// case and want the same wording, so it's defined once, next to the
// address it describes. `describe(mode)` is file_write's success-message
// fragment ("what did we just do"), same reasoning — computed once from
// the address, rather than re-derived per call site from `block`/`scope`/
// `from`/`to` closed over from the outer scope. Both are string-valued
// (not templates the caller fills in) since each target kind phrases
// "not found" / "what happened" differently enough that a shared template
// would need its own per-kind branching anyway — this way that branching
// lives in one place (here), not duplicated across file_read and
// file_write. `whole-file` has no not-found case (it always succeeds) and
// composes its own success message directly from `created`/`fileExists`,
// so it carries neither field, nor a read/write pair — the tool layer
// handles whole-file I/O directly against the client, not through a
// handler.
export type Target =
  | {
      kind: "markdown" | "raw";
      read(source: string): string | undefined;
      write(source: string, content: string, mode: WriteMode): string | undefined;
      notFoundError: string;
      describe(mode: WriteMode): string;
    }
  | { kind: "whole-file" };

export function resolveTarget(target: ResolveInput | undefined): Target {
  const input = target ?? {};
  if (input.block !== undefined) {
    const scope = input.scope ?? "body";
    const address: MarkdownAddress = { heading: input.block, scope };
    const handler = handlers.markdown;
    return {
      kind: "markdown",
      read: (source) => handler.read(source, address),
      write: (source, content, mode) => handler.write(source, address, content, mode),
      notFoundError: `No heading named "${input.block}" found.`,
      describe: (mode) => `block "${input.block}" (${scope}/${mode})`,
    };
  }
  if (input.from !== undefined) {
    const to = input.to;
    const address: RawAddress = { from: input.from, to };
    const handler = handlers.raw;
    // Labels show the raw indices as given (negative = from end, same as
    // the input) rather than resolved absolute line numbers — resolving
    // negative indices needs the file's line count, which isn't available
    // here (this runs before the file is read). "end" covers the one case
    // with no literal to show: `to` omitted with a negative `from`.
    const toLabel = to ?? (input.from < 0 ? "end" : input.from);
    return {
      kind: "raw",
      read: (source) => handler.read(source, address),
      write: (source, content, mode) => handler.write(source, address, content, mode),
      notFoundError: `Line range ${input.from}-${toLabel} is out of bounds.`,
      describe: (mode) => `lines ${input.from}-${toLabel} (${mode})`,
    };
  }
  return { kind: "whole-file" };
}
