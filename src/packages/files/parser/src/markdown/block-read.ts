import type { RootContent } from "mdast";
import { parseDocument, stringifyNodes } from "./document";
import { buildHeadingTree, type HeadingNode } from "./heading-tree";

// First match wins — headings aren't unique.
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

// Heading + all descendants in document order.
export function flattenHeading(heading: HeadingNode): RootContent[] {
  return [
    heading.node,
    ...heading.body,
    ...heading.children.flatMap(flattenHeading),
  ];
}

// Renders heading subtree to markdown, or undefined if not found.
export function readBlock(source: string, title: string): string | undefined {
  const tree = buildHeadingTree(parseDocument(source), true);
  const heading = findHeading(tree, title);
  if (!heading) return undefined;
  return stringifyNodes(flattenHeading(heading));
}

// Excludes heading line — read/write round trip must not duplicate it.
export function readBody(source: string, title: string): string | undefined {
  const tree = buildHeadingTree(parseDocument(source), true);
  const heading = findHeading(tree, title);
  if (!heading) return undefined;
  return stringifyNodes(heading.body);
}
