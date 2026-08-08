import { toString } from "mdast-util-to-string";
import type { Root, RootContent, Heading } from "mdast";

export interface HeadingNode {
  level: number;
  title: string;
  node: Heading; // for block-read/write reconstruction
  body: RootContent[]; // between heading and first child heading
  children: HeadingNode[];
}

// mdast headings are flat — depth implies nesting, stack rebuilds hierarchy.
// includeBody=false for outline() to skip body allocation.
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

    // Stops accumulating when child heading closes the parent.
    if (includeBody && stack.length > 0) {
      stack[stack.length - 1].body.push(child);
    }
  }

  return topLevel;
}
