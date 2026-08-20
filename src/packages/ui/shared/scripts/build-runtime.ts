import { rollup } from "rollup";
import type { Plugin } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import terser from "@rollup/plugin-terser";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const USAGE_PATH = resolve(__dirname, "../dist/used-exports.json");

// "\0" prefixes a virtual module id, so Rollup never resolves it from disk.
const ENTRY = "\0svelte-runtime-entry";

// Re-export only the client members apps actually use, so tree-shaking leaves
// a minimal runtime; disclose-version and legacy flags are always imported by
// compiled Svelte output.
interface UsedExports {
  svelte: string[];
  internal: string[];
}

function buildEntry(used: UsedExports | null): string {
  // Explicitly list top-level svelte exports — export * gets tree-shaken by
  // rollup's IIFE output because nothing in the bundle references them.
  const svelteExports = used?.svelte ?? [];
  const lines: string[] = [];
  if (svelteExports.length > 0) {
    lines.push(`export { ${svelteExports.join(", ")} } from "svelte";`);
  } else {
    lines.push('export * from "svelte";');
  }

  const internalExports = used?.internal ?? [];
  if (internalExports.length > 0) {
    lines.push(
      `export { ${internalExports.join(", ")} } from "svelte/internal/client";`,
    );
  } else {
    lines.push('export * from "svelte/internal/client";');
  }

  lines.push('export * from "svelte/internal/disclose-version";');
  lines.push('export * from "svelte/internal/flags/legacy";');

  return lines.join("\n");
}

const svelteRuntimeEntry = (used: UsedExports | null): Plugin => ({
  name: "svelte-runtime-entry",
  resolveId(id) {
    if (id === ENTRY) return ENTRY;
    return null;
  },
  load(id) {
    if (id !== ENTRY) return null;
    return buildEntry(used);
  },
});

mkdirSync(resolve(__dirname, "../dist"), { recursive: true });

const used: UsedExports | null = existsSync(USAGE_PATH)
  ? (JSON.parse(readFileSync(USAGE_PATH, "utf-8")) as UsedExports)
  : null;

if (used) {
  console.log(
    `build-runtime: building minimal runtime (${used.svelte.length} svelte + ${used.internal.length} internal exports)`,
  );
} else {
  console.log(
    "build-runtime: no used-exports.json found, building full runtime",
  );
}

const bundle = await rollup({
  input: ENTRY,
  plugins: [
    svelteRuntimeEntry(used),
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

// Content-hashed filename so the worker can cache the response as
// immutable — a content change always produces a new URL, so there's no
// stale-cache window between deploy and cache expiry/purge.
const hash = createHash("sha256").update(chunk.code).digest("hex").slice(0, 12);
const fileName = `svelte-runtime.${hash}.js`;
const outPath = resolve(__dirname, "../dist", fileName);
writeFileSync(outPath, chunk.code);

const bytes = chunk.code.length;
writeFileSync(
  resolve(__dirname, "../dist/svelte-runtime.meta.json"),
  // fileName/hash let consumers (the injection plugin, the worker route)
  // reference this build's output without recomputing the hash themselves.
  // Size + timestamp so CI can catch runtime regressions across builds.
  JSON.stringify(
    { fileName, hash, bytes, timestamp: new Date().toISOString() },
    null,
    2,
  ),
);

console.log(`build-runtime: ${fileName} (${(bytes / 1024).toFixed(1)} kB)`);
