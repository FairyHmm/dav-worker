import { getFilesConfig } from "../config/files.js";

const MAX_ALIAS_DEPTH = 50;

// Expand a symbolic path's leading `@alias` reference, recursively. Only
// a leading `@` is ever treated as an alias reference — literal paths are
// never interpreted as aliases (see Docs/SPEC-LOCATIONS.md).
export function expandAliases(path: string, depth = 0): string {
  if (!path.startsWith("@")) return path;

  if (depth > MAX_ALIAS_DEPTH) {
    throw new Error(
      `Alias expansion exceeded depth cap (${MAX_ALIAS_DEPTH}) — likely a cycle.`,
    );
  }

  const slashIdx = path.indexOf("/");
  const name = slashIdx === -1 ? path.slice(1) : path.slice(1, slashIdx);
  const rest = slashIdx === -1 ? "" : path.slice(slashIdx);

  const { aliases } = getFilesConfig();
  const value = aliases[name];
  if (value === undefined) {
    throw new Error(`Unknown alias: "@${name}"`);
  }

  return expandAliases(value + rest, depth + 1);
}
