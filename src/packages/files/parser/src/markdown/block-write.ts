import { toString } from "mdast-util-to-string";
import type { Root } from "mdast";
import { parseDocument, stringifyNodes } from "./document.js";

export type WriteScope = "body" | "subtree";
export type WriteMode = "replace" | "append";

interface HeadingRange {
  start: number; // index of the heading node itself
  // index of the first heading (any depth) after start — where this
  // heading's body ends, i.e. where its first child heading (if any) begins
  bodyEnd: number;
  // index of the first heading with depth <= this heading's depth after
  // start, i.e. where the whole subtree ends — same boundary flattenHeading
  // relies on for read
  subtreeEnd: number;
}

function findHeadingRange(
  root: Root,
  title: string,
): HeadingRange | undefined {
  const children = root.children;
  const start = children.findIndex(
    (c) => c.type === "heading" && toString(c) === title,
  );
  if (start === -1) return undefined;

  const level = (children[start] as { depth: number }).depth;

  let bodyEnd = children.length;
  let subtreeEnd = children.length;
  for (let i = start + 1; i < children.length; i++) {
    const c = children[i];
    if (c.type !== "heading") continue;
    if (bodyEnd === children.length) bodyEnd = i;
    if (c.depth <= level) {
      subtreeEnd = i;
      break;
    }
  }

  return { start, bodyEnd, subtreeEnd };
}

// Per SPEC.md's scope × mode table:
//   body/replace    — replace nodes between heading and first child
//   subtree/replace — replace heading + all descendants + their content
//   body/append     — append to end of body, before first child
//   subtree/append  — append after last node of subtree
//
// `content` is parsed as its own mini-document and spliced in as nodes —
// for scope="subtree" this must include the heading line itself (the same
// shape readBlock returns), for scope="body" it must not.
//
// Returns the full updated document, or undefined if no heading with that
// title exists.
export function writeBlock(
  source: string,
  title: string,
  content: string,
  scope: WriteScope,
  mode: WriteMode,
): string | undefined {
  const root = parseDocument(source);
  const range = findHeadingRange(root, title);
  if (!range) return undefined;

  const newNodes = parseDocument(content).children;

  if (scope === "body" && mode === "replace") {
    root.children.splice(
      range.start + 1,
      range.bodyEnd - (range.start + 1),
      ...newNodes,
    );
  } else if (scope === "subtree" && mode === "replace") {
    root.children.splice(
      range.start,
      range.subtreeEnd - range.start,
      ...newNodes,
    );
  } else if (scope === "body" && mode === "append") {
    root.children.splice(range.bodyEnd, 0, ...newNodes);
  } else {
    root.children.splice(range.subtreeEnd, 0, ...newNodes);
  }

  return stringifyNodes(root.children);
}
