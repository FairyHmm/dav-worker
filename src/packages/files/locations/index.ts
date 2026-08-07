// Barrel export for files/locations (Docs/SPEC-LOCATIONS.md). Config
// shape/parsing lives here, not files/tools, avoiding a files/tools <->
// files/locations cycle. Pure parse only — app/worker fetches config.toml.
export { resolveLocation } from "./src/resolve";
export {
  parseFilesConfig,
  buildFilesConfig,
  type FilesConfig,
  type RawConfig,
} from "./src/files";
