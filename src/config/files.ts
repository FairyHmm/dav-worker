import { parse } from "smol-toml";
// Config file (see Docs/SPEC-LOCATIONS.md), loaded as raw text via the
// Wrangler `Text` module rule for `**/*.toml`.
// Future: overridable via an env var pointing to an external file — not
// implemented yet.
import FILES_TOML from "./files.toml";

export interface FilesConfig {
  aliases: Record<string, string>;
  patterns: Record<string, string>;
}

interface RawConfig {
  aliases?: Record<string, string>;
  hosts?: Record<string, string[]>;
  patterns?: Record<string, string>;
}

// [hosts] is pure sugar over [aliases]: a shared parent path written once,
// applied to every project name listed under it.
//   "@projects/OSS" = ["dav-worker", "Pirell"]
// expands into:
//   dav-worker = "@projects/OSS/dav-worker"
//   Pirell     = "@projects/OSS/Pirell"
// merged into the same alias table as hand-written aliases — once
// expanded, a host-derived alias is indistinguishable from any other.
function expandHosts(
  aliases: Record<string, string>,
  hosts: Record<string, string[]>,
): Record<string, string> {
  const expanded = { ...aliases };
  for (const [parent, names] of Object.entries(hosts)) {
    for (const name of names) expanded[name] = `${parent}/${name}`;
  }
  return expanded;
}

let cached: FilesConfig | undefined;

export function getFilesConfig(): FilesConfig {
  if (!cached) {
    const raw = parse(FILES_TOML) as RawConfig;
    cached = {
      aliases: expandHosts(raw.aliases ?? {}, raw.hosts ?? {}),
      patterns: raw.patterns ?? {},
    };
  }
  return cached;
}
