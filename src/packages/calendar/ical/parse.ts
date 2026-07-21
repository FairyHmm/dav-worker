// Generic iCalendar component tree — protocol-ignorant, shared by VEVENT and
// VTODO. Mirrors parser/'s role but for iCalendar instead of Markdown: this
// module only knows about lines/properties/components, not what SUMMARY or
// DTSTART mean semantically. Field-level meaning lives in component.ts.

export interface ICalProperty {
  value: string;
  params: Record<string, string>;
}

export interface ICalComponent {
  name: string;
  // One property name can occur more than once (e.g. multiple ATTENDEEs),
  // so every name maps to an array even when there's usually just one.
  properties: Record<string, ICalProperty[]>;
  components: ICalComponent[];
}

// RFC 5545 §3.1: unfold — a CRLF followed by a single space or tab is a
// folded continuation of the previous line, not a real line break. Also
// tolerate bare \n (some servers/clients don't send \r\n).
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

// Splits one unfolded content line into name, params, and raw value.
// Format: NAME;PARAM1=VAL1;PARAM2=VAL2:VALUE — params and the name are
// separated from the value at the first colon that isn't inside a
// double-quoted param value (RFC 5545 permits quoting a param value that
// itself contains a colon, e.g. TZID or a URI-valued param).
function splitContentLine(line: string): { name: string; params: Record<string, string>; value: string } {
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

// Recursive-descent parse of a full VCALENDAR (or any BEGIN/END block) into
// an ICalComponent tree. Returns the outermost component (typically
// VCALENDAR) — callers use component.ts's findComponent() to locate a
// specific VEVENT/VTODO inside it.
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
