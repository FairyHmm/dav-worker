// Local dev composition root, independent of app/worker (SPEC-MONOREPO.md
// step 10). No OAuth round-trip — reads credential + config path from env
// vars and serves stdio directly, no consent screen or token exchange.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { assembleServer, loadConfig } from "@dav-worker/server-core";
import { createNextcloudWebDAVStorage } from "@dav-worker/storage-nextcloud";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .dev.vars.example to .dev.vars in src/app/local/ and fill it in, ` +
        `or export ${name} directly — this app reads from process.env, not Cloudflare bindings.`,
    );
  }
  return value;
}

async function main(): Promise<void> {
  const credential = {
    host: requireEnv("NEXTCLOUD_HOST"),
    username: requireEnv("NEXTCLOUD_USERNAME"),
    password: requireEnv("NEXTCLOUD_PASSWORD"),
  };

  const configPath = process.env.CONFIG_PATH;
  const fileStorage = createNextcloudWebDAVStorage(credential);
  const configContent = await loadConfig(
    configPath,
    fileStorage,
    // Falls back to the bundled fixture if CONFIG_PATH is unset, so this is
    // runnable before real config files exist on Nextcloud.
    () => readFile(join(moduleDir, "fixtures", "config.toml"), "utf-8"),
  );

  const server = new McpServer({ name: "dav-worker-local", version: "0.1.0" });
  await assembleServer(server, credential, configContent, configPath);
  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
