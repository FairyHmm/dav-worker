// Format-agnostic block read/write dispatch — markdown headings + raw line
// ranges. No filesystem, no WebDAV, no request/response shapes.

// Markdown — functions
export { parseDocument, stringifyNodes } from "./src/markdown/document";
export { buildHeadingTree } from "./src/markdown/heading-tree";
export { outline } from "./src/markdown/outline";
export {
  findHeading,
  flattenHeading,
  readBlock,
  readBody,
} from "./src/markdown/block-read";
export { writeBlock } from "./src/markdown/block-write";

// Markdown — types
export type { HeadingNode } from "./src/markdown/heading-tree";
export type { OutlineEntry } from "./src/markdown/outline";
export type { WriteScope } from "./src/markdown/block-write";

// Shared types
export type { WriteMode } from "./src/types";

// Raw
export { read, write } from "./src/raw/index";
export type { RawAddress } from "./src/raw/index";

// Registry — types only (implementations are internal)
export type { FormatHandler, MarkdownAddress } from "./src/registry";

// Resolve target
export { resolveTarget } from "./src/resolve-target";
export type { Target } from "./src/resolve-target";
