import { toString } from "mdast-util-to-string";
import type { Root, RootContent, Heading } from "mdast";

export interface HeadingNode {
  level: number;
  title: string;
  node: Heading; // kept for the block-read/write reconstruction step
  body: RootContent[]; // nodes between this heading and its first child heading
  children: HeadingNode[];
}

// mdast headings are flat siblings — nesting is implied only by `depth` —
// so this reconstructs the hierarchy with a stack keyed on depth.
//
// includeBody is false for outline() — no reason to allocate and hold onto
// body node arrays when only the heading titles/levels are needed. Block
// read/write call this with includeBody = true (the default).
export function buildHeadingTree(
  root: Root,
  includeBody = true,
): HeadingNode[] {
  const topLevel: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (const child of root.children) {
    if (child.type === "heading") {
      const heading: HeadingNode = {
        level: child.depth,
        title: toString(child),
        node: child,
        body: [],
        children: [],
      };

      while (
        stack.length > 0 &&
        stack[stack.length - 1].level >= heading.level
      ) {
        stack.pop();
      }

      if (stack.length === 0) {
        topLevel.push(heading);
      } else {
        stack[stack.length - 1].children.push(heading);
      }

      stack.push(heading);
      continue;
    }

    // Belongs to whichever heading is currently open; stops accumulating
    // once that heading's first child heading appears and becomes the top
    // of the stack instead.
    if (includeBody && stack.length > 0) {
      stack[stack.length - 1].body.push(child);
    }
  }

  return topLevel;
}
