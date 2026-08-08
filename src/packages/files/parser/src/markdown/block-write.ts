import { toString } from "mdast-util-to-string";
import type { Root } from "mdast";
import { parseDocument, stringifyNodes } from "./document";

import type { WriteMode } from "../types";

export type WriteScope = "body" | "subtree";

interface HeadingRange {
  start: number;
  bodyEnd: number; // first heading after start — body boundary
  subtreeEnd: number; // first heading with depth <= start — subtree boundary
}

function findHeadingRange(root: Root, title: string): HeadingRange | undefined {
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

// scope × mode: see SPEC.md. subtree/replace must include heading line;
// other combos must not. Returns updated doc, or undefined if heading missing.
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
  } else if (scope === "subtree" && mode === "append") {
    root.children.splice(range.subtreeEnd, 0, ...newNodes);
  } else {
    // Both scopes insert after heading line.
    root.children.splice(range.start + 1, 0, ...newNodes);
  }

  return stringifyNodes(root.children);
}
