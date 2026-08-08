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
      {
        // Dead codepath (no email routing here); drops mime-db's ~186KB. Throws if hit.
        name: "mimetext",
        resolveFrom: "mimetext",
        stub: function createMimeMessage() {
          throw new Error(
            "mimetext stubbed by worker-trim: replyToEmail is not supported in this build",
          );
        },
      },
      {
        // MCP SDK always imports ajv-provider statically; stubbing it (not the
        // transport files) drops ~100KB regardless of entry point.
        name: "mcp-sdk-ajv-provider",
        resolveFrom: "../validation/ajv-provider.js",
        stub: function AjvJsonSchemaValidator() {
          throw new Error(
            "AjvJsonSchemaValidator stubbed by worker-trim: dav-worker always supplies " +
              "CfWorkerJsonSchemaValidator explicitly",
          );
        },
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
