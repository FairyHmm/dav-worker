import type { WriteMode } from "../types";

export interface RawAddress {
  // 1-indexed, negative = from end, 0 invalid.
  from: number;
  // Omitted targets single line, -1 = end of file.
  to?: number;
}

// Consistent bounds failures, no silent clamping.
function resolveIndex(n: number, lineCount: number): number {
  return n < 0 ? lineCount + n + 1 : n;
}

function resolveRange(lines: string[], address: RawAddress) {
  const lineCount = lines.length;
  if (address.from === 0 || address.to === 0) return undefined;

  const from = resolveIndex(address.from, lineCount);
  const to =
    address.to !== undefined ? resolveIndex(address.to, lineCount) : from;

  if (from < 1 || to < from || to > lineCount || from > lineCount) {
    return undefined;
  }
  return { startIndex: from - 1, endIndex: to - 1 }; // 0-indexed, inclusive
}

export function read(source: string, address: RawAddress): string | undefined {
  const lines = source.split("\n");
  const range = resolveRange(lines, address);
  if (!range) return undefined;
  return lines.slice(range.startIndex, range.endIndex + 1).join("\n");
}

export function write(
  source: string,
  address: RawAddress,
  content: string,
  mode: WriteMode,
): string | undefined {
  const lines = source.split("\n");
  const range = resolveRange(lines, address);
  if (!range) return undefined;

  const newLines = content.split("\n");

  if (mode === "replace") {
    lines.splice(
      range.startIndex,
      range.endIndex - range.startIndex + 1,
      ...newLines,
    );
  } else if (mode === "append") {
    // after the addressed range, not replacing it
    lines.splice(range.endIndex + 1, 0, ...newLines);
  } else {
    // prepend — before the addressed range, not replacing it
    lines.splice(range.startIndex, 0, ...newLines);
  }

  return lines.join("\n");
}
