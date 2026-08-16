import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

// Single fully-inlined HTML document — same sandbox constraints as
// file-explorer (strict CSP, no external network). viteSingleFile inlines
// JS+CSS so the host can fetch ui://config as a single resource.
export default defineConfig({
  plugins: [
    svelte({ preprocess: [vitePreprocess()] }),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, "../../ui/shared/src/lib"),
      "$lib/": resolve(__dirname, "../../ui/shared/src/lib") + "/",
    },
  },
  build: {
    outDir: "dist",
    cssCodeSplit: false,
  },
});
