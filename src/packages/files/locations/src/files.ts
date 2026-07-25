import { parse } from "smol-toml";

// Config shape (see Docs/SPEC-LOCATIONS.md). No longer bundled at build
// time (TODO-MONOREPO 9e) — the raw TOML is fetched per-session from the
// user's configured Nextcloud path (SPEC-MONOREPO.md's Session Config) and
// parsed here into this shape. No module-level cache: `createServer`
// resolves this once per request and passes the result down via
// FileToolsDeps.config, which is the "per-request cache" the spec asks for.
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

export function parseFilesConfig(raw: string): FilesConfig {
  const rawConfig = parse(raw) as RawConfig;
  return {
    aliases: expandHosts(rawConfig.aliases ?? {}, rawConfig.hosts ?? {}),
    patterns: rawConfig.patterns ?? {},
  };
}
