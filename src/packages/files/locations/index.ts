// Barrel export for the files/locations package. Resolves named locations
// (Docs/SPEC-LOCATIONS.md) — alias/pattern expansion over a FilesConfig —
// into concrete vault-relative paths. Owns the config shape/parsing
// (files.ts's FilesConfig/parseFilesConfig) rather than depending on
// files/tools for it: files/tools is the only consumer of resolveLocation
// and never touches the raw config directly, so putting the config parsing
// here (not in files/tools, despite SPEC-MONOREPO.md's step 8 wording)
// avoids a files/tools <-> files/locations cycle — the same reasoning that
// put calendars.toml/ts inside calendar/tools rather than a separate
// package, just resolved in the other direction here since locations (not
// tools) is the actual consumer.
//
// As of TODO-MONOREPO 9e: no module-level config cache/bundled TOML import
// here anymore. `parseFilesConfig` is a pure parse; fetching the raw TOML
// from a user's session-configured Nextcloud path and calling it once per
// request is `app/worker`'s job (createServer), not this package's.
export { resolveLocation } from "./src/resolve.js";
export { parseFilesConfig, type FilesConfig } from "./src/files.js";
