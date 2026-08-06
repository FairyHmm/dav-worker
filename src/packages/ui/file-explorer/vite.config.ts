import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single fully-inlined HTML document per SPEC-UI.md sandbox constraints:
// MCP Apps run in a sandboxed iframe with strict CSP blocking external
// network requests by default. No CDN fonts/scripts/stylesheets, no
// separate asset host — viteSingleFile inlines JS+CSS into one HTML
// output so the host can fetch ui://file-explorer as a single resource.
export default defineConfig({
  plugins: [svelte(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist",
    // one entry -> one inlined document; no chunking, nothing to split
    cssCodeSplit: false,
  },
});
