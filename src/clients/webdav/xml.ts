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
