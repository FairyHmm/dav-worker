import type { UserConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { svelteRuntimePlugin } from "./svelte-runtime-plugin.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolved from this file's own location rather than the caller's cwd, so
// callers outside packages/ui/* (e.g. app/worker/consent) get the same
// $lib target without needing to know ui-shared's relative depth.
const SHARED_LIB = resolve(__dirname, "../lib");

export function defineUiConfig(
  assetVarName: string,
  options?: { root?: string },
): UserConfig {
  return {
    root: options?.root,
    plugins: [
      svelte({ preprocess: [vitePreprocess()] }),
      tailwindcss(),
      viteSingleFile(),
      svelteRuntimePlugin({ assetVarName }),
    ],
    resolve: {
      alias: {
        // Point $lib at ui-shared's sources so every app shares them as-is.
        $lib: SHARED_LIB,
        "$lib/": SHARED_LIB + "/",
      },
    },
    server: {
      proxy: {
        // Vite dev only: route MCP calls to the local HTTP dev server.
        "/mcp": "http://localhost:3747",
      },
    },
    build: {
      outDir: "dist",
      cssCodeSplit: false,
      rollupOptions: {
        // Leave svelte imports external so the runtime plugin can rewrite them
        // to the shared __svelte_runtime__ global instead of bundling svelte.
        external: (id: string) => id === "svelte" || id.startsWith("svelte/"),
        output: { format: "esm" as const },
      },
    },
  };
}
