import { handlers, type MarkdownAddress } from "./registry.js";
import type { RawAddress } from "./raw/index.js";
import type { WriteMode } from "./markdown/index.js";

// Mirrors the tool-layer TargetSchema union one-to-one (SPEC-PARSER.md),
// so mutual exclusivity is structural — no branch needs to check both
// `block` and `from` being set.
type ResolveInput =
  | {
      block: string;
      scope?: "body" | "subtree";
      from?: undefined;
      to?: undefined;
    }
  | { from: number; to?: number; block?: undefined; scope?: undefined }
  | { block?: undefined; scope?: undefined; from?: undefined; to?: undefined };

// Bound read/write avoids pairing a handler with its address at each call
// site. notFoundError/describe live here too, shared by file_read/write,
// so the per-kind wording isn't duplicated across both.
export type Target =
  | {
      kind: "markdown" | "raw";
      read(source: string): string | undefined;
      write(
        source: string,
        content: string,
        mode: WriteMode,
      ): string | undefined;
      notFoundError: string;
      describe(mode: WriteMode): string;
    }
  | { kind: "whole-file" };

// Only shifts positive (absolute) indices — negative ones are "N-th from
// end" and stay correct on their own as the file grows/shrinks.
function shiftPositive(n: number, shift: number): number {
  return n > 0 ? n + shift : n;
}

export function resolveTarget(
  target: ResolveInput | undefined,
  shift = 0,
): Target {
  const input = target ?? {};
  if (input.block !== undefined) {
    const scope = input.scope ?? "body";
    const address: MarkdownAddress = { heading: input.block, scope };
    const handler = handlers.markdown;
    return {
      kind: "markdown",
      read: (source) => handler.read(source, address),
      write: (source, content, mode) =>
        handler.write(source, address, content, mode),
      notFoundError: `No heading named "${input.block}" found.`,
      describe: (mode) => `block "${input.block}" (${scope}/${mode})`,
    };
  }
  if (input.from !== undefined) {
    const to = input.to;
    const shiftedFrom = shiftPositive(input.from, shift);
    const shiftedTo = to !== undefined ? shiftPositive(to, shift) : to;
    const address: RawAddress = { from: shiftedFrom, to: shiftedTo };
    const handler = handlers.raw;
    // Show pre-shift indices — the caller planned this against their own
    // original read, so the message should match what they wrote.
    const toLabel = to ?? (input.from < 0 ? "end" : input.from);
    return {
      kind: "raw",
      read: (source) => handler.read(source, address),
      write: (source, content, mode) =>
        handler.write(source, address, content, mode),
      notFoundError: `Line range ${input.from}-${toLabel} is out of bounds.`,
      describe: (mode) => `lines ${input.from}-${toLabel} (${mode})`,
    };
  }
  return { kind: "whole-file" };
}
