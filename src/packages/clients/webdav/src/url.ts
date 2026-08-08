export function davPath(basePath: string, path: string): string {
  const clean = path.replace(/^\/+/, "");
  // Per-segment encoding: whole-string encoding turns `/` into `%2F`.
  const encoded = clean
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${basePath}/${encoded}`;
}

export function davUrl(host: string, basePath: string, path: string): string {
  return `${host}${davPath(basePath, path)}`;
}
