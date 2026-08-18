import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";

// Emits dist/asset.ts after build so server/core can import the HTML string
// without depending on esbuild's text loader.
function emitAssetModule(): import("vite").Plugin {
  return {
    name: "emit-asset-module",
    closeBundle() {
      const html = readFileSync(resolve(__dirname, "dist/index.html"), "utf-8");
      writeFileSync(
        resolve(__dirname, "dist/asset.ts"),
        `export const configHtml = ${JSON.stringify(html)};\n`,
      );
    },
  };
}

// Single fully-inlined HTML document — same sandbox constraints as
// file-explorer (strict CSP, no external network). viteSingleFile inlines
// JS+CSS so the host can fetch ui://config as a single resource.
export default defineConfig({
  plugins: [
    svelte({ preprocess: [vitePreprocess()] }),
    tailwindcss(),
    viteSingleFile(),
    emitAssetModule(),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, "../../ui/shared/src/lib"),
      "$lib/": resolve(__dirname, "../../ui/shared/src/lib") + "/",
    },
  },
  server: {
    proxy: {
      // Forward /mcp to the local HTTP dev server (app/local start:http).
      "/mcp": "http://localhost:3747",
    },
  },
  build: {
    outDir: "dist",
    cssCodeSplit: false,
  },
});
