// Barrel export for config/parser (SPEC-CONFIG.md).
export {
  parseAppConfig,
  type AppConfig,
  type RawAppConfig,
} from "./src/config";
export { writeSection } from "./src/write";
export { parseDisabled, type DisabledShape } from "./src/disabled";
export { resolve } from "./src/resolve";
