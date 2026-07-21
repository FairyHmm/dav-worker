import { readBlock, writeBlock, type WriteMode } from "./markdown/index.js";
import { read as readRaw, write as writeRaw, type RawAddress } from "./raw/index.js";

// Wearable by any future format (tree-sitter, json, etc.) without the tool
// layer caring which one it got — see SPEC-PARSER.md.
export interface FormatHandler<Address> {
	read(source: string, address: Address): string | undefined;
	write(source: string, address: Address, content: string, mode: WriteMode): string | undefined;
}

export interface MarkdownAddress {
	heading: string;
	scope: "body" | "subtree";
}

// Wraps the existing readBlock/writeBlock free functions to wear
// FormatHandler<MarkdownAddress>. readBlock always returns the full
// subtree regardless of `scope` — scope only affects write — so it's
// accepted on the address but unused on read.
export const markdownHandler: FormatHandler<MarkdownAddress> = {
	read(source, address) {
		return readBlock(source, address.heading);
	},
	write(source, address, content, mode) {
		return writeBlock(source, address.heading, content, address.scope, mode);
	},
};

// Wraps the raw read/write free functions to wear FormatHandler<RawAddress>.
export const rawHandler: FormatHandler<RawAddress> = {
	read: readRaw,
	write: writeRaw,
};

// Pure lookup table, no dispatch logic — routing (deciding which key to
// use for a given call) lives in resolveTarget() in the tool layer, not
// here.
export const handlers = {
	markdown: markdownHandler,
	raw: rawHandler,
} satisfies Record<string, FormatHandler<any>>;
