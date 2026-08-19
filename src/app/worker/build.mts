// Replaces Wrangler's internal esbuild pass so worker-trim's stub plugin can run
// (Wrangler can't take esbuild plugins: cloudflare/workers-sdk#234).
import * as esbuild from "esbuild";
import type { BuildOptions } from "esbuild";
import { stubModulesPlugin } from "@dav-worker/worker-trim";

// zod/v3's ZodFirstPartyTypeKind enum keys (types.js), as data to avoid
// hand-formatting an object literal in the stub string below.
const ZOD_V3_TYPE_KINDS = [
  "ZodString",
  "ZodNumber",
  "ZodNaN",
  "ZodBigInt",
  "ZodBoolean",
  "ZodDate",
  "ZodSymbol",
  "ZodUndefined",
  "ZodNull",
  "ZodAny",
  "ZodUnknown",
  "ZodNever",
  "ZodVoid",
  "ZodArray",
  "ZodObject",
  "ZodUnion",
  "ZodDiscriminatedUnion",
  "ZodIntersection",
  "ZodTuple",
  "ZodRecord",
  "ZodMap",
  "ZodSet",
  "ZodFunction",
  "ZodLazy",
  "ZodLiteral",
  "ZodEnum",
  "ZodEffects",
  "ZodNativeEnum",
  "ZodOptional",
  "ZodNullable",
  "ZodDefault",
  "ZodCatch",
  "ZodPromise",
  "ZodBranded",
  "ZodPipeline",
  "ZodReadonly",
] as const;

// zod-v3-compat-shim needs two exports (enum data + object()), and worker-trim
// only takes one stub per resolveFrom - can't split across two targets.
function zodV3ObjectUnreachable() {
  throw new Error(
    "zod/v3 stubbed by worker-trim: dav-worker only constructs zod v4 schemas, " +
      "so the SDK's zod-compat.js v3 fallback should be unreachable",
  );
}

// EntityDecoder only calls isUnsafe(value, [HTML, XML]); the other context
// tables are dead weight pulled in by is-unsafe's eager .label assignment.
const IS_UNSAFE_DEAD_CONTEXTS = [
  "svg",
  "sql",
  "shell",
  "redos",
  "nosql",
  "log",
  "sql-strict",
] as const;

const buildOptions: BuildOptions = {
  entryPoints: ["index.ts"],
  bundle: true,
  minify: true,
  treeShaking: true,
  format: "esm",
  platform: "node",
  conditions: ["workerd", "worker"],
  external: ["cloudflare:*"],
  outfile: "dist/index.js",
  sourcemap: true,
  metafile: true,

  // no_bundle:true skips Wrangler's own .toml/.csv text loader too
  loader: {
    ".toml": "text",
    ".html": "text",
  },

  plugins: [
    stubModulesPlugin([
      {
        // dav-worker's content never authors named HTML entities, so
        // decoding them on markdown parse buys nothing worth 60KB.
        name: "character-entities",
        resolveFrom: "character-entities",
        stub: "export const characterEntities = {};",
      },
      {
        // Only `en` is used for error messages; this drops ~270KB of other locales.
        name: "zod-non-english-locales",
        resolveFrom: "../locales/index.js",
        stub: "export {};",
      },
      // The unused is-unsafe context tables above.
      ...IS_UNSAFE_DEAD_CONTEXTS.map((ctx) => ({
        name: `is-unsafe-context-${ctx}`,
        resolveFrom: `./contexts/${ctx}.js`,
        stub: "export default [];",
      })),
      {
        // XMLParser.validate() only runs when a truthy validationOption is
        // passed, which dav-worker's XML parsing never does (~4.9KB).
        name: "fast-xml-parser-validator",
        resolveFrom: "../validator.js",
        stub: "export function validate(){ throw new Error('fast-xml-parser validator stubbed by worker-trim (dav-worker never enables XML validation)'); }",
      },
      {
        // WebDAV/CalDAV responses never contain <!DOCTYPE>. setXmlVersion()
        // still fires per <?xml ...?>, so keep it as a no-op. Drops ~5KB + deps.
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
        // All MCP schemas come from zod, so the JSON Schema -> zod converter
        // is never used here.
        name: "zod-from-json-schema",
        resolveFrom: "./from-json-schema.js",
        stub: "export function fromJSONSchema(){ throw new Error('zod from-json-schema stubbed by worker-trim (unused in dav-worker)'); }",
      },
      {
        // zod-to-json-schema and the MCP SDK's zod-compat.js both pull in the
        // full zod v3 class hierarchy (~56KB) just for compat fallbacks
        // dav-worker never hits, since all schemas here are zod v4.
        name: "zod-v3-compat-shim",
        resolveFrom: "zod/v3",
        stub: [
          `export const ZodFirstPartyTypeKind = { ${ZOD_V3_TYPE_KINDS.map(
            (k) => `${k}: ${JSON.stringify(k)}`,
          ).join(", ")} };`,
          `export const object = ${zodV3ObjectUnreachable.toString()};`,
        ].join("\n"),
      },
    ]),
  ],
};

const result = await esbuild.build(buildOptions);

console.log("worker-trim: build complete -> dist/index.js");

if (process.env.WORKER_TRIM_METAFILE) {
  const fs = await import("node:fs/promises");
  await fs.writeFile("dist/meta.json", JSON.stringify(result.metafile));
  console.log("worker-trim: wrote dist/meta.json");
}
