import { rollup } from "rollup";
import type { Plugin } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import terser from "@rollup/plugin-terser";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const USAGE_PATH = resolve(__dirname, "../dist/used-exports.json");

// "\0" prefixes a virtual module id, so Rollup never resolves it from disk.
const ENTRY = "\0svelte-runtime-entry";

// Re-export only the client members apps actually use, so tree-shaking leaves
// a minimal runtime; disclose-version and legacy flags are always imported by
// compiled Svelte output.
function buildEntry(usedExports: string[] | null): string {
  const lines = ['export * from "svelte";'];

  if (usedExports && usedExports.length > 0) {
    lines.push(
      `export { ${usedExports.join(", ")} } from "svelte/internal/client";`,
    );
  } else {
    lines.push('export * from "svelte/internal/client";');
  }

  lines.push('export * from "svelte/internal/disclose-version";');
  lines.push('export * from "svelte/internal/flags/legacy";');

  return lines.join("\n");
}

const svelteRuntimeEntry = (usedExports: string[] | null): Plugin => ({
  name: "svelte-runtime-entry",
  resolveId(id) {
    if (id === ENTRY) return ENTRY;
    return null;
  },
  load(id) {
    if (id !== ENTRY) return null;
    return buildEntry(usedExports);
  },
});

mkdirSync(resolve(__dirname, "../dist"), { recursive: true });

const usedExports: string[] | null = existsSync(USAGE_PATH)
  ? (JSON.parse(readFileSync(USAGE_PATH, "utf-8")) as string[])
  : null;

if (usedExports) {
  console.log(
    `build-runtime: building minimal runtime (${usedExports.length} exports)`,
  );
} else {
  console.log(
    "build-runtime: no used-exports.json found, building full runtime",
  );
}

const bundle = await rollup({
  input: ENTRY,
  plugins: [
    svelteRuntimeEntry(usedExports),
    nodeResolve({
      exportConditions: ["browser"],
      extensions: [".js", ".ts", ".json"],
    }),
    commonjs(),
    // esbuild minifies fast; terser's multi-pass compress squeezes out the rest.
    esbuild({ target: "es2022", minify: true }),
    terser({ module: false, compress: { passes: 2 }, mangle: true }),
  ],
  onwarn(warning, warn) {
    // These are inherent to bundling Svelte's own internals, not bugs here.
    if (warning.code === "CIRCULAR_DEPENDENCY") return;
    if (warning.code === "EVAL") return;
    if (warning.code === "THIS_IS_UNDEFINED") return;
    if (warning.code === "NAMESPACE_CONFLICT") return;
    warn(warning);
  },
});

const output = await bundle.generate({
  format: "iife",
  // IIFE assigns __svelte_runtime__ globally, which the plugin rewrites imports to.
  name: "__svelte_runtime__",
  inlineDynamicImports: true,
});
await bundle.close();

const chunk = output.output[0];
const outPath = resolve(__dirname, "../dist/svelte-runtime.js");
writeFileSync(outPath, chunk.code);

const bytes = chunk.code.length;
writeFileSync(
  resolve(__dirname, "../dist/svelte-runtime.meta.json"),
  // Size + timestamp so CI can catch runtime regressions across builds.
  JSON.stringify({ bytes, timestamp: new Date().toISOString() }, null, 2),
);

console.log(`build-runtime: ${(bytes / 1024).toFixed(1)} kB`);
