import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = resolve(__dirname, "..");
const DIST_DIR = resolve(SHARED_DIR, "dist");
const UNION_PATH = resolve(DIST_DIR, "used-exports.json");

export interface UiApp {
  name: string;
  dir: string;
  assetVarName: string;
  // Override for apps with no local package.json (e.g. one mounted inside
  // another workspace, which needs a direct binary path instead).
  buildCommand?: { cmd: string; args: string[] };
}

// Every caller gets these for free; only pass apps beyond this set.
const DEFAULT_APPS: UiApp[] = [
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
];

export interface UsedExports {
  svelte: string[];
  internal: string[];
}

function buildApp(app: UiApp): void {
  const { cmd, args } = app.buildCommand ?? {
    cmd: "pnpm",
    args: ["run", "build"],
  };
  // No shell involved — avoids /bin/sh portability issues.
  const result = spawnSync(cmd, args, { cwd: app.dir, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${app.name}: build failed with exit code ${result.status}`,
    );
  }
  const usagePath = resolve(app.dir, "dist/used-exports.json");
  if (existsSync(usagePath)) {
    const usage: UsedExports = JSON.parse(readFileSync(usagePath, "utf-8"));
    console.log(
      `  ${app.name}: ${usage.svelte.length} svelte + ${usage.internal.length} internal`,
    );
  }
}

function unionUsage(apps: UiApp[]): void {
  mkdirSync(DIST_DIR, { recursive: true });
  const allSvelte = new Set<string>();
  const allInternal = new Set<string>();

  for (const app of apps) {
    const usagePath = resolve(app.dir, "dist/used-exports.json");
    if (!existsSync(usagePath)) {
      console.warn(`  !! ${app.name}: no used-exports.json`);
      continue;
    }
    const usage: UsedExports = JSON.parse(readFileSync(usagePath, "utf-8"));
    for (const exp of usage.svelte) allSvelte.add(exp);
    for (const exp of usage.internal) allInternal.add(exp);
  }

  const result: UsedExports = {
    svelte: [...allSvelte].sort(),
    internal: [...allInternal].sort(),
  };
  console.log(
    `  Total unique: ${result.svelte.length} svelte + ${result.internal.length} internal`,
  );
  writeFileSync(UNION_PATH, JSON.stringify(result, null, 2));
}

// Two-pass build: discovery → runtime → final. The runtime needs the union
// of all apps' used-exports, so pass 1 must complete before it can build.
export function buildApps(extraApps: UiApp[] = []): void {
  const apps = [...DEFAULT_APPS, ...extraApps];

  console.log("═══ Pass 1: Discovery builds ═══");
  for (const app of apps) {
    console.log(`  Building ${app.name} (discovery)...`);
    buildApp(app);
  }

  console.log("\n═══ Building minimal runtime ═══");
  unionUsage(apps);
  const runtimeScript = resolve(__dirname, "build-runtime.ts");
  const runtimeResult = spawnSync("pnpm", ["exec", "tsx", runtimeScript], {
    stdio: "inherit",
  });
  if (runtimeResult.error) throw runtimeResult.error;
  if (runtimeResult.status !== 0) {
    throw new Error(
      `build-runtime failed with exit code ${runtimeResult.status}`,
    );
  }

  console.log("\n═══ Pass 2: Final builds ═══");
  for (const app of apps) {
    console.log(`  Building ${app.name} (final)...`);
    buildApp(app);
  }

  console.log("\n═══ Done ═══");
}

// Run with defaults when invoked directly; callers import buildApps() instead.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  buildApps();
}
