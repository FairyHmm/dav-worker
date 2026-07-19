// Single source of truth for turning a vault-relative path into a WebDAV
// URL path. Encodes each segment individually — encoding the whole string
// in one pass turns `/` into `%2F` and breaks the path structure; not
// encoding at all breaks on spaces and reserved characters (`#`, `?`, `%`).
// Every request — including the absolute Destination URL for MOVE/COPY —
// goes through these two functions.

export function davPath(basePath: string, path: string): string {
  const clean = path.replace(/^\/+/, "");
  const encoded = clean
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${basePath}/${encoded}`;
}

export function davUrl(host: string, basePath: string, path: string): string {
  return `${host}${davPath(basePath, path)}`;
}
