import { parse } from "smol-toml";

// Config shape (Docs/SPEC-LOCATIONS.md). No module-level cache —
// app/worker's createServer resolves this once per request.
export interface FilesConfig {
  aliases: Record<string, string>;
  patterns: Record<string, string>;
}

export interface RawConfig {
  aliases?: Record<string, string>;
  hosts?: Record<string, string[]>;
  patterns?: Record<string, string>;
}

// [hosts] is sugar over [aliases]: a shared parent applied to every name
// listed under it, e.g. "@projects/OSS" = ["dav-worker"] expands to
// dav-worker = "@projects/OSS/dav-worker", merged into the same table.
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

// Split from parseFilesConfig so config/parser can hand in an already
// smol-toml-parsed [locations] sub-table without re-serializing to TOML.
export function buildFilesConfig(rawConfig: RawConfig): FilesConfig {
  return {
    aliases: expandHosts(rawConfig.aliases ?? {}, rawConfig.hosts ?? {}),
    patterns: rawConfig.patterns ?? {},
  };
}

export function parseFilesConfig(raw: string): FilesConfig {
  const rawConfig = parse(raw) as RawConfig;
  return buildFilesConfig(rawConfig);
}
