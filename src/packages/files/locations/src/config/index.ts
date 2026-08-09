import { parse } from "smol-toml";

// No cache — resolved once per request in createServer.
export interface FilesConfig {
  aliases: Record<string, string>;
  patterns: Record<string, string>;
}

export interface RawConfig {
  aliases?: Record<string, string>;
  hosts?: Record<string, string[]>;
  patterns?: Record<string, string>;
}

// Hosts expand to synthetic aliases — parent/name pattern.
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

// Separate from parseFilesConfig for pre-parsed TOML input.
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
