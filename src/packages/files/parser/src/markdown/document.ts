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
} from "./preprocess.js";

// vfile's constructor calls process.cwd() unless `cwd` is explicitly
// supplied — workerd has no `process`, so that call throws. Always
// construct our own VFile with `cwd` set rather than letting unified
// wrap a bare string/object internally.
function toVFile(value: string): VFile {
  return new VFile({ value, cwd: "/" });
}

// The single parse+stringify pipeline. Both directions share one processor
// so a future syntax addition (another remark plugin) only needs to be
// listed once here.
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkMath)
  .use(remarkStringify);

export function parseDocument(source: string): Root {
  return processor.parse(toVFile(preprocessPercentComments(source))) as Root;
}

// Renders a list of mdast nodes back to markdown text via the same
// pipeline's stringify step, rather than manual string splicing. Every
// call site (readBlock, writeBlock) goes through this one function, so
// restorePercentComments only needs to be wired in here to cover both.
export function stringifyNodes(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };
  return restorePercentComments(
    String(processor.stringify(root, toVFile(""))),
  );
}
