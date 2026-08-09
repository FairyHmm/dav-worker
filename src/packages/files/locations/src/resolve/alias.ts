import type { FilesConfig } from "../config/index.js";

const MAX_ALIAS_DEPTH = 50;

// Only leading @ is an alias — literal paths pass through.
export function expandAliases(
  config: FilesConfig,
  path: string,
  depth = 0,
): string {
  if (!path.startsWith("@")) return path;

  if (depth > MAX_ALIAS_DEPTH) {
    throw new Error(
      `Alias expansion exceeded depth cap (${MAX_ALIAS_DEPTH}) — likely a cycle.`,
    );
  }

  const slashIdx = path.indexOf("/");
  const name = slashIdx === -1 ? path.slice(1) : path.slice(1, slashIdx);
  const rest = slashIdx === -1 ? "" : path.slice(slashIdx);

  const value = config.aliases[name];
  if (value === undefined) {
    throw new Error(`Unknown alias: "@${name}"`);
  }

  return expandAliases(config, value + rest, depth + 1);
}
