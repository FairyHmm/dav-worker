import { resolveLocation } from "@dav-worker/files-locations";
import type { FilesConfig } from "@dav-worker/files-locations";

export function resolvePath(
  config: FilesConfig,
  input: { path?: string; location?: string },
  opts: { allowRoot?: boolean } = {},
): string {
  if (input.location) {
    const base = resolveLocation(config, input.location);
    return input.path ? joinRelative(base, input.path) : base;
  }
  if (input.path !== undefined) return input.path;
  // allowRoot opts in explicitly (dir_list only) — everywhere else,
  // a caller forgetting both path and location should error, not
  // silently target the vault root.
  if (opts.allowRoot) return "";
  throw new Error("Provide either `path` or `location`.");
}

function joinRelative(base: string, rel: string): string {
  const b = base.replace(/\/+$/, "");
  const r = rel.replace(/^\/+/, "");
  return b ? `${b}/${r}` : r;
}
