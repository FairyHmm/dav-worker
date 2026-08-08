import { parseDocument } from "./document";
import { buildHeadingTree, type HeadingNode } from "./heading-tree";

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

// Titles/levels only — no body content allocated.
export function outline(source: string): OutlineEntry[] {
  return toOutline(buildHeadingTree(parseDocument(source), false));
}
