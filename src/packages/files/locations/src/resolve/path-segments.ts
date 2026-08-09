// Shared helpers for /-separated, \-escapable path syntax.

// Split on /, backslash escapes the next char.
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

// Resolve backslash escapes to literals.
export function unescape(segment: string): string {
  return segment.replace(/\\([/@*\\])/g, "$1");
}

// Index of first unescaped *, or -1.
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
