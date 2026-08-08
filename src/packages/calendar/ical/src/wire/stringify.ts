import type { ICalComponent } from "../types";

// RFC 5545 §3.1: fold at 75 octets (not JS string length). Multi-byte UTF-8
// characters would otherwise cause late folding if we counted string length.
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    // Don't split a multi-byte sequence: back off past continuation bytes.
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
    limit = 74; // continuation lines lose one octet to the leading space
  }
  return parts.join("\r\n ");
}

function serializeProperty(
  name: string,
  prop: { value: string; params: Record<string, string> },
): string {
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
