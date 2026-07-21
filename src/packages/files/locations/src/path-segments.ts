// Shared low-level helpers for the `/`-separated, `\`-escapable string
// syntax used by both TOML pattern keys and tool-supplied location inputs.

// Split on `/`, treating `\/` (and any other `\x`) as a literal, unsplit
// character rather than a separator.
export function splitSegments(path: string): string[] {
  const segments: string[] = [];
  let current = "";
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (c === "\\" && i + 1 < path.length) {
      current += c + path[i + 1];
      i++;
    } else if (c === "/") {
      segments.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  segments.push(current);
  return segments;
}

// Resolve `\/`, `\@`, `\*`, `\\` escapes into their literal characters.
export function unescape(segment: string): string {
  return segment.replace(/\\([/@*\\])/g, "$1");
}

// Index of the first *unescaped* `*` in a raw (still-escaped) segment, or
// -1 if the segment has none.
export function wildcardIndex(segment: string): number {
  for (let i = 0; i < segment.length; i++) {
    if (segment[i] === "\\") {
      i++;
      continue;
    }
    if (segment[i] === "*") return i;
  }
  return -1;
}
