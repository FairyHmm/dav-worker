// %% is not CommonMark — naive regex until micromark extension lands (SPEC.md).
export function preprocessPercentComments(source: string): string {
  return source.replace(
    /%%([\s\S]*?)%%/g,
    (_match, inner: string) => `<!--%%${inner}%%-->`,
  );
}

// Only unwraps our tagged markers — user-authored HTML comments pass through.
export function restorePercentComments(source: string): string {
  return source.replace(
    /<!--%%([\s\S]*?)%%-->/g,
    (_match, inner: string) => `%%${inner}%%`,
  );
}
