// RFC 5545 §3.3.11: only ; , \ and newlines are escaped in TEXT values.
// Colon is NOT escaped — a common over-escaping bug in other libraries.

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

// CATEGORIES-style comma-separated TEXT lists need escape-aware splitting —
// a literal comma inside "Home, Improvements" looks like a list separator
// without tracking escape state across the split.
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
