// Barrel export for config/parser (SPEC-CONFIG.md).
export {
  parseAppConfig,
  type AppConfig,
  type RawAppConfig,
  CONFIG_SECTIONS,
  type ConfigSection,
  type ConfigSections,
  createEmptySections,
} from "./src/config";
export { writeSection } from "./src/write";
export type { LocationsShape } from "./src/locations";
export type { CalendarsShape } from "./src/calendars";
export { parseDisabled, type DisabledShape } from "./src/disabled";
export { resolve } from "./src/resolve";
