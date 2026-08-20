import { rollup } from "rollup";
import type { Plugin } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import terser from "@rollup/plugin-terser";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rollupStub } from "@dav-worker/worker-trim";
import type { StubTarget } from "@dav-worker/worker-trim";
import { svelteRuntimeLoader } from "@dav-worker/ui-shared/svelte-runtime-loader";
import { svgLoader } from "@dav-worker/ui-shared/svg-loader";

// EntityDecoder only ever uses the HTML/XML contexts; the rest are dead weight
// that is-unsafe's eager .label assignment drags in.
const IS_UNSAFE_DEAD_CONTEXTS = [
  "svg",
  "sql",
  "shell",
  "redos",
  "nosql",
  "log",
  "sql-strict",
] as const;

const stubTargets: StubTarget[] = [
  {
    // dav-worker never authors named HTML entities, so decoding them costs 60KB for nothing.
    name: "character-entities",
    resolveFrom: "character-entities",
    stub: "export const characterEntities = {};",
  },
  ...IS_UNSAFE_DEAD_CONTEXTS.map((ctx) => ({
    name: `is-unsafe-context-${ctx}`,
    resolveFrom: `./contexts/${ctx}.js`,
    stub: "export default [];",
  })),
  {
    // validate() only runs when a truthy validationOption is passed, which dav-worker never does.
    name: "fast-xml-parser-validator",
    resolveFrom: "../validator.js",
    stub: "export function validate(){ throw new Error('fast-xml-parser validator stubbed by worker-trim (dav-worker never enables XML validation)'); }",
  },
  {
    // WebDAV/CalDAV never serves <!DOCTYPE>; keep setXmlVersion() as a no-op since it still fires per <?xml?>.
    name: "fast-xml-parser-doc-type-reader",
    resolveFrom: "./DocTypeReader.js",
    stub: [
      "export default class DocTypeReader {",
      "  constructor(options) { this.suppressValidationErr = !options; this.options = options; }",
      "  setXmlVersion() {}",
      "  readDocType() { throw new Error('<!DOCTYPE> not supported in dav-worker (stubbed by worker-trim)'); }",
      "}",
    ].join("\n"),
  },
  {
    // All MCP schemas come from zod, so the JSON Schema -> zod converter is never used.
    name: "zod-from-json-schema",
    resolveFrom: "./from-json-schema.js",
    stub: "export function fromJSONSchema(){ throw new Error('zod from-json-schema stubbed by worker-trim (unused in dav-worker)'); }",
  },
];

// wrangler.jsonc's Text rule for .toml/.csv doesn't apply now that we bundle
// ourselves, so imports need a loader here.
const textModuleLoader = (): Plugin => ({
  name: "worker-trim-text-loader",
  async load(id) {
    if (!/\.(html|toml)$/.test(id)) return null;
    const contents = await readFile(id, "utf8");
    return {
      code: `export default ${JSON.stringify(contents)}`,
      moduleSideEffects: false,
    };
  },
});

const CONSENT_ASSETS = resolve(import.meta.dirname, "consent/src/assets");

// Wrangler can't run esbuild plugins (workers-sdk#234), so we bundle here;
// rollup + terser also beat esbuild's output by ~50KB / 6%.
const bundle = await rollup({
  input: "index.ts",
  treeshake: { moduleSideEffects: false },
  plugins: [
    rollupStub(stubTargets),
    textModuleLoader(),
    svelteRuntimeLoader(),
    svgLoader(CONSENT_ASSETS, "nextcloud-icon.svg"),
    nodeResolve({
      exportConditions: ["workerd", "worker"],
      extensions: [".ts", ".mjs", ".js", ".jsx", ".tsx", ".json"],
    }),
    commonjs(),
    json(),
    esbuild({ target: "esnext", sourceMap: true, minifyWhitespace: false }),
    terser({ module: true, compress: { passes: 2 }, mangle: true }),
  ],
  external: (id) => id.startsWith("cloudflare:"),
  onwarn(warning, warn) {
    if (warning.code === "CIRCULAR_DEPENDENCY") return;
    warn(warning);
  },
});

const output = await bundle.generate({ format: "esm", sourcemap: true });
await bundle.close();

const chunk = output.output[0];
const fs = await import("node:fs/promises");
await fs.writeFile("dist/index.js", chunk.code);
if (chunk.map) await fs.writeFile("dist/index.js.map", chunk.map.toString());

console.log("worker-trim: build complete -> dist/index.js");

if (process.env.WORKER_TRIM_METAFILE) {
  const stat = await Promise.all(
    bundle.watchFiles.map((p) => fs.stat(p).catch(() => null)),
  );
  const inputs = Object.fromEntries(
    bundle.watchFiles.map((p, i) => [
      p.replace(`${process.cwd()}/`, ""),
      stat[i]?.size ?? 0,
    ]),
  );
  await fs.writeFile(
    "dist/meta.json",
    JSON.stringify(
      { inputs, outputs: { [chunk.fileName]: { bytes: chunk.code.length } } },
      null,
      1,
    ),
  );
  console.log("worker-trim: wrote dist/meta.json");
}
