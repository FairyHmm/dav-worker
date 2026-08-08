import { unified } from "unified";
import { VFile } from "vfile";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkStringify from "remark-stringify";
import type { Root, RootContent } from "mdast";
import {
  preprocessPercentComments,
  restorePercentComments,
} from "./preprocess";

// workerd has no `process` — must set cwd explicitly.
function toVFile(value: string): VFile {
  return new VFile({ value, cwd: "/" });
}

// Shared processor — new plugins only listed once.
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkMath)
  .use(remarkStringify);

export function parseDocument(source: string): Root {
  return processor.parse(toVFile(preprocessPercentComments(source))) as Root;
}

// Single stringify path — restorePercentComments wired once covers all callers.
export function stringifyNodes(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };
  return restorePercentComments(String(processor.stringify(root, toVFile(""))));
}
