// Naive plain string preprocess for Obsidian-style comments: %%...%% is not
// CommonMark and no remark plugin covers it, so this string-replaces it into
// an HTML comment before remarkParse ever sees the source. Must run first in
// the pipeline. Known limitation: naive regex, not fence-aware — a literal
// %% inside a code block would still be converted. See SPEC.md.
export function preprocessPercentComments(source: string): string {
  return source.replace(
    /%%([\s\S]*?)%%/g,
    (_match, inner: string) => `<!--${inner}-->`,
  );
}
