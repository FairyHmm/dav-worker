import type { ConfigToolsDeps } from "../deps";

// Bootstrapping: a missing config.toml isn't an error — parseAppConfig("")
// and writeSection("", ...) both already handle "" as the zero-value
// (SPEC-CONFIG.md), so a 404 read just resolves to "".
export async function readConfigContent(
  deps: ConfigToolsDeps,
): Promise<string> {
  try {
    return (await deps.storage.read(deps.path)).content;
  } catch {
    return "";
  }
}
