import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = resolve(__dirname, "..");
const DIST_DIR = resolve(SHARED_DIR, "dist");
const UNION_PATH = resolve(DIST_DIR, "used-exports.json");

const APPS = [
  {
    name: "config",
    dir: resolve(__dirname, "../../config"),
    assetVarName: "configHtml",
  },
  {
    name: "file-explorer",
    dir: resolve(__dirname, "../../file-explorer"),
    assetVarName: "fileExplorerHtml",
  },
] as const;

function buildApp(name: string, dir: string): void {
  execSync("pnpm run build", { cwd: dir, stdio: "inherit" });
  const assetPath = resolve(dir, "dist/asset.ts");
  if (existsSync(assetPath)) {
    const kb = (readFileSync(assetPath).length / 1024).toFixed(1);
    console.log(`  ${name}: asset.ts ${kb} kB`);
  }
}

function unionUsage(): void {
  mkdirSync(DIST_DIR, { recursive: true });
  const all = new Set<string>();
  for (const app of APPS) {
    const usagePath = resolve(app.dir, "dist/used-exports.json");
    if (!existsSync(usagePath)) {
      console.warn(`  !! ${app.name}: no used-exports.json`);
      continue;
    }
    const usage: string[] = JSON.parse(readFileSync(usagePath, "utf-8"));
    console.log(`  ${app.name}: ${usage.length} exports`);
    // One shared runtime serves every app, so take the union across all of them.
    for (const exp of usage) all.add(exp);
  }
  const sorted = [...all].sort();
  console.log(`  Total unique: ${sorted.length}`);
  writeFileSync(UNION_PATH, JSON.stringify(sorted, null, 2));
}

// Discovery must run first: each app's used-exports.json decides what the
// shared runtime will contain.
console.log("═══ Pass 1: Discovery builds ═══");

for (const app of APPS) {
  console.log(`  Building ${app.name} (discovery)...`);
  buildApp(app.name, app.dir);
}

console.log("\n═══ Building minimal runtime ═══");
unionUsage();
const runtimeScript = resolve(__dirname, "build-runtime.ts");
execSync(`pnpm exec tsx ${runtimeScript}`, { stdio: "inherit" });

// Rebuild now that the runtime exists so the plugin injects it and rewrites
// the bare svelte imports.
console.log("\n═══ Pass 2: Final builds ═══");

for (const app of APPS) {
  console.log(`  Building ${app.name} (final)...`);
  buildApp(app.name, app.dir);
}

console.log("\n═══ Done ═══");
