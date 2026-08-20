import type { Plugin } from "rollup";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Parameterized: the caller knows where its assets live.
export const svgLoader = (assetsDir: string, file: string): Plugin => ({
  name: "svg-loader",
  resolveId(id) {
    if (id === "virtual:nextcloud-icon") return "\0" + id;
    return null;
  },
  async load(id) {
    if (id !== "\0virtual:nextcloud-icon") return null;
    const contents = await readFile(resolve(assetsDir, file), "utf8");
    return {
      code: `export default ${JSON.stringify(contents)};`,
      moduleSideEffects: false,
    };
  },
});
