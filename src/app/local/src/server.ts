import { McpServer } from "@modelcontextprotocol/server";

// Local dev composition root, independent of app/worker (SPEC-MONOREPO.md
// step 10). No OAuth round-trip — reads credential + config path from env
// vars and serves directly, no consent screen or token exchange.
import { assembleServer, loadConfig } from "@dav-worker/server-core";
import { createNextcloudWebDAVStorage } from "@dav-worker/storage-nextcloud";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const srcDir = dirname(fileURLToPath(import.meta.url));
const localDir = join(srcDir, "..");

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .dev.vars.example to .dev.vars in src/app/local/ and fill it in, ` +
        `or export ${name} directly — this app reads from process.env, not Cloudflare bindings.`,
    );
  }
  return value;
}

export function getCredential() {
  return {
    host: requireEnv("NEXTCLOUD_HOST"),
    username: requireEnv("NEXTCLOUD_USERNAME"),
    password: requireEnv("NEXTCLOUD_PASSWORD"),
  };
}

export function getConfigPath() {
  return process.env.CONFIG_PATH;
}

export async function createMcpServer(
  credential: { host: string; username: string; password: string },
  configPath: string | undefined,
  serverName = "dav-worker-local",
) {
  const fileStorage = createNextcloudWebDAVStorage(credential);
  const configContent = await loadConfig(
    configPath,
    fileStorage,
    // Falls back to the bundled fixture if CONFIG_PATH is unset, so this is
    // runnable before real config files exist on Nextcloud.
    () => readFile(join(localDir, "fixtures", "config.toml"), "utf-8"),
  );

  const server = new McpServer({ name: serverName, version: "0.1.0" });
  await assembleServer(server, credential, configContent, configPath);
  return server;
}
