import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single fully-inlined HTML document — same sandbox constraints as
// file-explorer (strict CSP, no external network). viteSingleFile inlines
// JS+CSS so the host can fetch ui://config as a single resource.
export default defineConfig({
  plugins: [svelte(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist",
    cssCodeSplit: false,
  },
});
