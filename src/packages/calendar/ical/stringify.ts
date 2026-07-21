import type { ICalComponent } from "./parse.js";

// RFC 5545 §3.1: fold any content line longer than 75 octets by inserting
// CRLF + a single space before the 76th octet, repeating as needed. Using
// UTF-8 byte length (not JS string length / UTF-16 code units) — a line
// full of multi-byte characters would otherwise be folded too late.
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    // Don't split a multi-byte UTF-8 sequence: back off while the next byte
    // is a continuation byte (top two bits == 10).
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
    limit = 74; // continuation lines lose one octet to the leading space
  }
  return parts.join("\r\n ");
}

function serializeProperty(name: string, prop: { value: string; params: Record<string, string> }): string {
  const paramStr = Object.entries(prop.params)
    .map(([k, v]) => `;${k}=${/[:;,]/.test(v) ? `"${v}"` : v}`)
    .join("");
  return foldLine(`${name}${paramStr}:${prop.value}`);
}

function serializeComponent(component: ICalComponent): string[] {
  const lines: string[] = [`BEGIN:${component.name}`];

  for (const [name, occurrences] of Object.entries(component.properties)) {
    for (const prop of occurrences) {
      lines.push(serializeProperty(name, prop));
    }
  }

  for (const sub of component.components) {
    lines.push(...serializeComponent(sub));
  }

  lines.push(`END:${component.name}`);
  return lines;
}

export function stringifyCalendar(component: ICalComponent): string {
  return serializeComponent(component).join("\r\n") + "\r\n";
}
