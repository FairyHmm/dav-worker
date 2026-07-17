import { parseDocument } from "./document.js";
import { buildHeadingTree, type HeadingNode } from "./heading-tree.js";

export interface OutlineEntry {
  level: number;
  title: string;
  children: OutlineEntry[];
}

function toOutline(headings: HeadingNode[]): OutlineEntry[] {
  return headings.map((h) => ({
    level: h.level,
    title: h.title,
    children: toOutline(h.children),
  }));
}

// Heading titles/levels only, no body content — see buildHeadingTree's
// includeBody note.
export function outline(source: string): OutlineEntry[] {
  return toOutline(buildHeadingTree(parseDocument(source), false));
}
