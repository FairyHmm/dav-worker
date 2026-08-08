import { readBlock, readBody } from "./markdown/block-read";
import { writeBlock } from "./markdown/block-write";
import type { WriteMode } from "./types";
import {
  read as readRaw,
  write as writeRaw,
  type RawAddress,
} from "./raw/index";

// Format-agnostic handler interface.
export interface FormatHandler<Address> {
  read(source: string, address: Address): string | undefined;
  write(
    source: string,
    address: Address,
    content: string,
    mode: WriteMode,
  ): string | undefined;
}

export interface MarkdownAddress {
  heading: string;
  scope: "body" | "subtree";
}

// Adapts markdown read/write to FormatHandler.
export const markdownHandler: FormatHandler<MarkdownAddress> = {
  read(source, address) {
    return address.scope === "subtree"
      ? readBlock(source, address.heading)
      : readBody(source, address.heading);
  },
  write(source, address, content, mode) {
    return writeBlock(source, address.heading, content, address.scope, mode);
  },
};

// Adapts raw read/write to FormatHandler.
export const rawHandler: FormatHandler<RawAddress> = {
  read: readRaw,
  write: writeRaw,
};

// Routing lives in resolveTarget(), not here.
export const handlers = {
  markdown: markdownHandler,
  raw: rawHandler,
} satisfies Record<string, FormatHandler<any>>;
