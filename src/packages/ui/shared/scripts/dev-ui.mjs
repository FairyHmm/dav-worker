import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const APP_DIR = process.cwd();
const HTTP_SERVER_PACKAGE = "@dav-worker/app-local";

if (!existsSync(resolve(APP_DIR, "vite.config.ts"))) {
  console.error(`dev-ui: no vite.config.ts in ${APP_DIR}`);
  console.error(
    "Run from an MCP Apps UI package (e.g. src/packages/ui/config).",
  );
  process.exit(1);
}

const children = new Set();

function run(name, cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: false });
  children.add(child);
  child.on("exit", (code, signal) => {
    console.log(`[dev-ui] ${name} exited (${signal ?? code})`);
    stop();
  });
  return child;
}

function stop() {
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// Vite's dev server proxies /mcp to this local bridge, so it must be up first.
run("http", "pnpm", ["-F", HTTP_SERVER_PACKAGE, "start:http"]);

// Wait for the HTTP server to bind before Vite starts proxying to it.
setTimeout(() => {
  run("vite", "pnpm", ["exec", "vite"]);
}, 2000);
