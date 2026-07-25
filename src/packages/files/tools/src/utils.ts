import { resolveLocation } from "@dav-worker/files-locations";
import type { FilesConfig } from "@dav-worker/files-locations";

// Deliberately duplicated (not shared) — see SPEC-MONOREPO.md A.7: the only
// sanctioned cross-domain edge is auth/upstream's Credential/TokenStore.
// This is a 6-line MCP response-shape helper, not a domain concern.
export const text = (t: string) => ({ type: "text" as const, text: t });
export const ok = (t: string) => ({ content: [text(t)] });
export const err = (e: unknown) => ({
  content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)],
  isError: true,
});

// Shared by every tool that takes `path`/`location`. Previously each tool
// did `location ? resolveLocation(...) : (pathArg ?? "")` inline, which
// silently collapsed "caller passed neither" into "" (vault root) — fine
// for nc_files_list (root listing is documented, intended behavior) but
// dangerous for delete/write/mkdir/move/copy: a client that forgot to pass
// a path would silently target the vault root instead of erroring.
// `allowRoot` opts a tool into the old root-default behavior explicitly;
// everything else now requires one of `path`/`location`.
export function resolvePath(
  config: FilesConfig,
  input: { path?: string; location?: string },
  opts: { allowRoot?: boolean } = {},
): string {
  if (input.location) return resolveLocation(config, input.location);
  if (input.path !== undefined) return input.path;
  if (opts.allowRoot) return "";
  throw new Error("Provide either `path` or `location`.");
}
