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

// `<d:collection/>` parses to `""`, not `true` — check key presence, not truthiness.
export function isCollection(prop: any): boolean {
  return !!prop?.resourcetype && "collection" in prop.resourcetype;
}

// A prop that doesn't apply (e.g. no getcontentlength on a dir) comes back
// in its own 404 propstat — merge all of them instead of assuming one.
export function mergedProps(r: any): any {
  // fast-xml-parser gives a bare object for one propstat, an array for many.
  const propstats: any[] = [].concat(r.propstat ?? []);
  return propstats.reduce((acc, ps) => Object.assign(acc, ps?.prop ?? {}), {});
}

// A missing/inapplicable prop parses to `""`, not undefined/null.
export function propOrNull(value: unknown): string | null {
  return value === "" || value == null ? null : String(value);
}

// fast-xml-parser leaves numeric refs for CR/LF/TAB undecoded — CalDAV
// needs the real \r\n back to survive XML's line-ending normalization.
export function decodeMissedNumericEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
