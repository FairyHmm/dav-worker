import type { RootContent } from "mdast";
import { parseDocument, stringifyNodes } from "./document.js";
import { buildHeadingTree, type HeadingNode } from "./heading-tree.js";

// Exact-match search over the tree, depth-first. Headings aren't guaranteed
// unique in a document; first match wins.
export function findHeading(
  headings: HeadingNode[],
  title: string,
): HeadingNode | undefined {
  for (const h of headings) {
    if (h.title === title) return h;
    const found = findHeading(h.children, title);
    if (found) return found;
  }
  return undefined;
}

// "Subtree" per SPEC.md: the heading node + all content + all descendant
// headings recursively, in original document order.
export function flattenHeading(heading: HeadingNode): RootContent[] {
  return [
    heading.node,
    ...heading.body,
    ...heading.children.flatMap(flattenHeading),
  ];
}

// Returns the rendered markdown for a heading's subtree, or undefined if no
// heading with that title exists in the document.
export function readBlock(source: string, title: string): string | undefined {
  const tree = buildHeadingTree(parseDocument(source), true);
  const heading = findHeading(tree, title);
  if (!heading) return undefined;
  return stringifyNodes(flattenHeading(heading));
}

// "Body" per SPEC.md: content directly under the heading only, up to (not
// including) the first child heading. Excludes the heading line itself —
// matches what writeBlock's body/replace expects as input, so a read-then-
// write round trip on scope="body" doesn't duplicate or drop the heading.
export function readBody(source: string, title: string): string | undefined {
  const tree = buildHeadingTree(parseDocument(source), true);
  const heading = findHeading(tree, title);
  if (!heading) return undefined;
  return stringifyNodes(heading.body);
}
