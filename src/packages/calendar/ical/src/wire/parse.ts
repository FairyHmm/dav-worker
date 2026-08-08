import type { ICalComponent, ICalProperty } from "../types";

// RFC 5545 §3.1: CRLF + whitespace is a folded continuation, not a line break.
// Also tolerate bare \n since some servers don't send \r\n.
export function unfold(text: string): string[] {
  const raw = text.split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.length > 0) {
      lines.push(line);
    }
  }
  return lines;
}

// Param values can contain colons when double-quoted (RFC 5545 permits this
// for TZID and URI-valued params), so we scan for the first unquoted colon.
function splitContentLine(line: string): {
  name: string;
  params: Record<string, string>;
  value: string;
} {
  let inQuotes = false;
  let colonIdx = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ":" && !inQuotes) {
      colonIdx = i;
      break;
    }
  }
  if (colonIdx === -1) {
    throw new Error(`Malformed iCalendar content line (no value): ${line}`);
  }

  const head = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const [name, ...paramParts] = head.split(";");

  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).toUpperCase();
    let val = part.slice(eq + 1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    params[key] = val;
  }

  return { name: name.toUpperCase(), params, value };
}

// Recursive-descent parse of a VCALENDAR (or any BEGIN/END block).
// Callers use findComponent() to locate VEVENT/VTODO inside the result.
export function parseCalendar(text: string): ICalComponent {
  const lines = unfold(text);
  let pos = 0;

  function parseBlock(): ICalComponent {
    const beginLine = splitContentLine(lines[pos]);
    if (beginLine.name !== "BEGIN") {
      throw new Error(`Expected BEGIN, got: ${lines[pos]}`);
    }
    const name = beginLine.value.toUpperCase();
    pos++;

    const component: ICalComponent = { name, properties: {}, components: [] };

    while (pos < lines.length) {
      const parsed = splitContentLine(lines[pos]);
      if (parsed.name === "BEGIN") {
        component.components.push(parseBlock());
        continue;
      }
      if (parsed.name === "END") {
        if (parsed.value.toUpperCase() !== name) {
          throw new Error(
            `Mismatched END: expected ${name}, got ${parsed.value}`,
          );
        }
        pos++;
        return component;
      }

      const prop: ICalProperty = { value: parsed.value, params: parsed.params };
      (component.properties[parsed.name] ??= []).push(prop);
      pos++;
    }

    throw new Error(`Unterminated component: ${name}`);
  }

  if (lines.length === 0) {
    throw new Error("Empty iCalendar text");
  }
  return parseBlock();
}
