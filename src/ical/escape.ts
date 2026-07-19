// RFC 5545 §3.3.11 TEXT value escaping/unescaping. Shared by Schedule
// (VEVENT) and Tasks (VTODO) so this doesn't get discovered per-tool the
// way davPath escaping was (SPEC.md risk #4).
//
// Only backslash, semicolon, comma, and newline are escaped for TEXT.
// Colon is NOT escaped in TEXT values (only ; , \ and newlines are,
// per RFC 5545) — a common source of over-escaping bugs.

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

export function unescapeText(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "\\" && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === "n" || next === "N") {
        out += "\n";
        i++;
      } else if (next === "\\" || next === ";" || next === ",") {
        out += next;
        i++;
      } else {
        out += c;
      }
    } else {
      out += c;
    }
  }
  return out;
}

// Splits a CATEGORIES-style comma-separated TEXT list on unescaped commas,
// then unescapes each item. `escapeText`/`unescapeText` alone don't handle
// this because a literal comma inside one category ("Home, Improvements")
// is indistinguishable from a list separator without tracking escape state
// across the split.
export function splitTextList(value: string): string[] {
  const items: string[] = [];
  let current = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "\\" && i + 1 < value.length) {
      current += c + value[i + 1];
      i++;
    } else if (c === ",") {
      items.push(unescapeText(current));
      current = "";
    } else {
      current += c;
    }
  }
  items.push(unescapeText(current));
  return items;
}

export function joinTextList(items: string[]): string {
  return items.map(escapeText).join(",");
}
