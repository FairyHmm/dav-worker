import type { Plugin } from "rollup";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED_DIST = resolve(__dirname, "../dist");

// Content-hashed filename from build-runtime.ts so the worker route always
// matches whatever was hashed at build-ui time.
export const svelteRuntimeLoader = (): Plugin => ({
  name: "svelte-runtime-loader",
  resolveId(id) {
    if (id === "virtual:svelte-runtime") return "\0" + id;
    return null;
  },
  async load(id) {
    if (id !== "\0virtual:svelte-runtime") return null;
    const meta = JSON.parse(
      await readFile(resolve(SHARED_DIST, "svelte-runtime.meta.json"), "utf8"),
    ) as { fileName: string };
    const contents = await readFile(resolve(SHARED_DIST, meta.fileName), "utf8");
    return {
      code: [
        `export const fileName = ${JSON.stringify(meta.fileName)};`,
        `export const contents = ${JSON.stringify(contents)};`,
      ].join("\n"),
      moduleSideEffects: false,
    };
  },
});
