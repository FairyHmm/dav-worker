import type { WriteMode } from "../markdown/index.js";

export interface RawAddress {
	// 1-indexed inclusive. Negative = counted from end, Python-slice style
	// (-1 = last line, -10 = 10th-from-last). 0 is not a valid line number
	// in either direction and is rejected below.
	from: number;
	// 1-indexed inclusive, or negative (same convention as `from`).
	// Omitted: targets that single line, whether `from` is positive or
	// negative — symmetric with the positive case, no special-casing.
	// To span to the end of the file, pass `to: -1` explicitly.
	to?: number;
}

// Plain split("\n")/splice.
//
// Resolves negative indices against the actual line count first, then
// reuses the exact same bounds checks as the positive case — so a
// negative `from`/`to` that lands out of range (e.g. `from: -1000` on a
// 5-line file) fails the same way a too-large positive one does, rather
// than silently clamping.
function resolveIndex(n: number, lineCount: number): number {
	return n < 0 ? lineCount + n + 1 : n;
}

function resolveRange(lines: string[], address: RawAddress) {
	const lineCount = lines.length;
	if (address.from === 0 || address.to === 0) return undefined;

	const from = resolveIndex(address.from, lineCount);
	const to = address.to !== undefined ? resolveIndex(address.to, lineCount) : from;

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
		lines.splice(range.startIndex, range.endIndex - range.startIndex + 1, ...newLines);
	} else if (mode === "append") {
		// after the addressed range, not replacing it
		lines.splice(range.endIndex + 1, 0, ...newLines);
	} else {
		// prepend — before the addressed range, not replacing it
		lines.splice(range.startIndex, 0, ...newLines);
	}

	return lines.join("\n");
}
