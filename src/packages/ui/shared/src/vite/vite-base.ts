import type { UserConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { svelteRuntimePlugin } from "./svelte-runtime-plugin.ts";

export function defineUiConfig(assetVarName: string): UserConfig {
  return {
    plugins: [
      svelte({ preprocess: [vitePreprocess()] }),
      tailwindcss(),
      viteSingleFile(),
      svelteRuntimePlugin({ assetVarName }),
    ],
    resolve: {
      alias: {
        // Point $lib at ui-shared's sources so both apps share them as-is.
        $lib: "../../ui/shared/src/lib",
        "$lib/": "../../ui/shared/src/lib/",
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
