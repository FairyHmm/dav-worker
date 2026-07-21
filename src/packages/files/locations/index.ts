// Barrel export for the files/locations package. Resolves named locations
// (Docs/SPEC-LOCATIONS.md) — alias/pattern expansion over files.toml — into
// concrete vault-relative paths. Owns its own config (files.ts/files.toml)
// rather than depending on files/tools for it: files/tools is the only
// consumer of resolveLocation and never touches the raw config directly, so
// putting files.* here (not in files/tools, despite SPEC-MONOREPO.md's step
// 8 wording) avoids a files/tools <-> files/locations cycle — the same
// reasoning that put calendars.toml/ts inside calendar/tools rather than a
// separate package, just resolved in the other direction here since
// locations (not tools) is the actual consumer.
export { resolveLocation } from "./src/resolve.js";
export { getFilesConfig, type FilesConfig } from "./src/files.js";
