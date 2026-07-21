// Naive plain string preprocess for Obsidian-style comments: %%...%% is not
// CommonMark and no remark plugin covers it, so this string-replaces it into
// an HTML comment before remarkParse ever sees the source. Must run first in
// the pipeline. Known limitation: naive regex, not fence-aware — a literal
// %% inside a code block would still be converted. See SPEC.md.
//
// The marker is `<!--%%...%%-->`, not a bare `<!--...-->` — a real
// micromark syntax extension (its own mdast node type + matching
// remark-stringify compiler, the shape remark-math uses for `$...$`) would
// round-trip losslessly and is the documented upgrade path if this ever
// matters enough to justify it, but that's a lot of machinery for a single
// comment syntax. Tagging the marker instead means `%%comment%%` is
// distinguishable from a genuine `<!-- comment -->` the person wrote by
// hand, so restorePercentComments can reverse only the ones we created —
// html nodes stringify their raw value back out verbatim, so this round
// trips exactly as long as nothing downstream re-escapes html node content.
export function preprocessPercentComments(source: string): string {
  return source.replace(
    /%%([\s\S]*?)%%/g,
    (_match, inner: string) => `<!--%%${inner}%%-->`,
  );
}

// Reverses preprocessPercentComments after stringify. Only unwraps markers
// carrying our `%%...%%` tag, so a comment the person wrote as literal
// HTML (`<!-- note -->`) is left alone.
export function restorePercentComments(source: string): string {
  return source.replace(
    /<!--%%([\s\S]*?)%%-->/g,
    (_match, inner: string) => `%%${inner}%%`,
  );
}
