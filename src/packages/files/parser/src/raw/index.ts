import type { WriteMode } from "../markdown/index.js";

export interface RawAddress {
	from: number; // 1-indexed inclusive
	to?: number; // 1-indexed inclusive; omitted = single line (from)
}

// Plain split("\n")/splice
function resolveRange(lines: string[], address: RawAddress) {
	const from = address.from;
	const to = address.to ?? address.from;
	if (from < 1 || to < from || to > lines.length || from > lines.length) {
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
	} else {
		// append — after the addressed range, not replacing it
		lines.splice(range.endIndex + 1, 0, ...newLines);
	}

	return lines.join("\n");
}
