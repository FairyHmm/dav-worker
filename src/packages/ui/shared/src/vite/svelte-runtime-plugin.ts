import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Plugin, ResolvedConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_PATH = resolve(__dirname, "../../dist/svelte-runtime.js");

const NAMESPACE_IMPORT_RE =
  /import\s*\*\s*as\s+([A-Za-z_$]\w*)\s*from\s*["']svelte\/internal\/client["'];?\s*/g;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteSvelteImports(code: string): string {
  // \s* keeps the rewrites resilient to however the minifier formats imports.
  const NAMESPACE_RE =
    /import\s*\*\s*as\s+([A-Za-z_$]\w*)\s*from\s*["']svelte\/internal\/client["'];?/g;
  const NAMED_RE = /import\s*\{([^}]*)\}\s*from\s*"([^"]*)"/g;
  const DISCARD_RE = /import\s*"([^"]*)"/g;
  const EXPORT_RE = /export\s*(\{[^}]*\})\s*from\s*"([^"]*)"/g;

  return code
    .replace(NAMESPACE_RE, "const $1=__svelte_runtime__")
    .replace(NAMED_RE, (_, imports: string, spec: string) => {
      if (!spec.startsWith("svelte")) return _;
      const names = imports
        .split(",")
        .map((s: string) =>
          s
            .trim()
            .split(/\s+as\s+/)
            .pop()
            ?.trim(),
        )
        .filter(Boolean);
      return `const{${names.join(",")}}=__svelte_runtime__`;
    })
    .replace(DISCARD_RE, (m, spec: string) =>
      spec.startsWith("svelte") ? "" : m,
    )
    .replace(EXPORT_RE, "export $1=__svelte_runtime__")
    .replace(/;{2,}/g, ";");
}

const MODULE_SCRIPT_RE =
  /(<script[^>]*type="module"[^>]*>)([\s\S]*?)(<\/script>)/;

// A surviving bare svelte import wouldn't resolve in the sandboxed iframe, so
// this is a hard build failure, not a warning.
const UNREWRITTEN_SVELTE_IMPORT_RE =
  /\b(?:im|ex)port[^;\n]*["']svelte(?:\/|["'])/;

export function injectRuntime(html: string, runtimeCode: string): string {
  html = html.replace("</head>", `<script>${runtimeCode}</script></head>`);
  const result = html.replace(
    MODULE_SCRIPT_RE,
    (_, opening: string, code: string, closing: string) =>
      opening + rewriteSvelteImports(code) + closing,
  );

  const leftover = UNREWRITTEN_SVELTE_IMPORT_RE.exec(result);
  if (leftover) {
    throw new Error(
      `svelte-runtime: unrewritten svelte import survived injection ` +
        `(${JSON.stringify(leftover[0])}). The bundler's output formatting ` +
        `likely changed and the rewrite regexes in rewriteSvelteImports() ` +
        `no longer match — this must be fixed before the sandboxed iframe ` +
        `can load this asset.`,
    );
  }

  return result;
}

/**
 * Vite plugin that builds a shared minimal Svelte runtime and injects it into
 * each single-file app bundle, since the sandboxed iframe can't fetch or
 * resolve the bare `svelte` packages on its own.
 */
export function svelteRuntimePlugin(options?: {
  assetVarName?: string;
}): Plugin {
  const assetVarName = options?.assetVarName ?? "configHtml";
  let config: ResolvedConfig;
  const usedExports = new Set<string>();

  return {
    name: "svelte-runtime",
    configResolved(resolved) {
      config = resolved;
    },
    transform: {
      order: "post",
      handler(code, id) {
        if (id.includes("node_modules")) return null;
        // Compiled Svelte imports client as a namespace and calls members on
        // it; only those members need to exist in the shared runtime.
        const nsMatches = [...code.matchAll(NAMESPACE_IMPORT_RE)];
        if (nsMatches.length === 0) return null;
        for (const match of nsMatches) {
          const ns = match[1];
          const accessRe = new RegExp(
            `(?<![\\w$])${escapeRegex(ns)}\\.([A-Za-z_]\\w*)`,
            "g",
          );
          let m;
          while ((m = accessRe.exec(code)) !== null) {
            usedExports.add(m[1]);
          }
        }
        return null;
      },
    },
    generateBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      mkdirSync(outDir, { recursive: true });
      // Feeds build-runtime, which emits only the exports apps actually use.
      writeFileSync(
        resolve(outDir, "used-exports.json"),
        JSON.stringify([...usedExports].sort(), null, 2),
      );
    },
    closeBundle() {
      // First-pass builds run before the runtime exists; skip them, the second
      // pass (build-all) rebuilds with the runtime in place.
      if (!existsSync(RUNTIME_PATH)) return;

      const outDir = resolve(config.root, config.build.outDir);
      const htmlPath = resolve(outDir, "index.html");
      const html = readFileSync(htmlPath, "utf-8");
      const runtimeCode = readFileSync(RUNTIME_PATH, "utf-8");
      const asset = injectRuntime(html, runtimeCode);

      writeFileSync(
        resolve(outDir, "asset.ts"),
        `export const ${assetVarName} = ${JSON.stringify(asset)};\n`,
      );
    },
  };
}
