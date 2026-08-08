import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

const sharedLib = resolve(__dirname, "../../../packages/ui/shared/src/lib");

// Single inlined HTML document, same technique as ui/file-explorer — not
// for sandbox/CSP reasons here (this is a normal browser-navigated page,
// not an MCP Apps iframe resource), but so the worker's build step can
// embed one static HTML string via esbuild's text loader.
export default defineConfig({
  root: __dirname,
  plugins: [
    svelte({ preprocess: [vitePreprocess()] }),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "$lib": sharedLib,
      "$lib/": sharedLib + "/",
    },
  },
  build: {
    // Relative to `root`, so this always resolves to consent/dist
    // regardless of the cwd the build/dev script is invoked from.
    outDir: "dist",
    cssCodeSplit: false,
  },
});
