import { XMLParser } from "fast-xml-parser";

export const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getlastmodified/>
    <d:displayname/>
  </d:prop>
</d:propfind>`;

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

// fast-xml-parser parses an empty self-closing tag like `<d:collection/>`
// into `""`, not `true` — a truthiness check on the value is always false.
// Presence of the key is what indicates a directory.
export function isCollection(prop: any): boolean {
  return !!prop?.resourcetype && "collection" in prop.resourcetype;
}

// Nextcloud splits a <d:response> into multiple <d:propstat> blocks when
// some requested properties don't apply (e.g. a directory has no
// getcontentlength, so that prop comes back in its own 404 propstat).
// Merge every propstat's props together instead of assuming a single one.
export function mergedProps(r: any): any {
  const propstats: any[] = [].concat(r.propstat ?? []);
  return propstats.reduce((acc, ps) => Object.assign(acc, ps?.prop ?? {}), {});
}

// A missing/inapplicable prop parses to `""`, not undefined/null — normalize
// it so callers can use straightforward null-checks.
export function propOrNull(value: unknown): string | null {
  return value === "" || value == null ? null : String(value);
}

// fast-xml-parser (4.5.x, at least) doesn't decode numeric character
// references for control characters like CR/LF/TAB (&#13; &#10; &#9;) —
// left as literal text instead of the actual character. CalDAV servers
// rely on exactly those entities to carry calendar-data's real CRLF line
// endings through XML's line-ending normalization, so an undecoded &#13;
// corrupts every content line (e.g. "BEGIN:VCALENDAR&#13;" instead of
// "BEGIN:VCALENDAR\r"), which then corrupts ical/parse.ts's unfolded
// component names (a VEVENT's BEGIN line's value becomes "VEVENT&#13;",
// not "VEVENT") — silently breaking every findComponent("VEVENT") lookup
// downstream. Standard entities (&amp; &lt; etc.) ARE handled fine by
// fast-xml-parser; only the numeric-reference path for these three is
// affected, so that's all this covers.
export function decodeMissedNumericEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
