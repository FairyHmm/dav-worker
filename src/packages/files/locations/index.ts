// Location resolution: config parsing → pattern matching → alias expansion.
export { resolveLocation } from "./src/resolve/index.js";
export {
  buildFilesConfig,
  type FilesConfig,
  type RawConfig,
} from "./src/config/index.js";
