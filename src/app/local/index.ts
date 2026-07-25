// Local dev composition root. Deliberately independent of app/worker: per
// SPEC-MONOREPO.md step 10, no Layer-1/Layer-2 branching lives inside the
// worker's fetch handler — this file is its own place to wire things up.
//
// There's no OAuth round-trip and no fixture "TokenStore" (that concept
// predates the stateless-auth rewrite — see Docs/SPEC-STATELESS-AUTH.md).
// Instead this reads a Nextcloud credential + config paths straight out of
// local env vars and registers tools for a stdio MCP transport, so a local
// client (Claude Desktop, `mcp-inspector`, etc.) can point straight at this
// process without any consent screen or token exchange.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFileTools } from "@dav-worker/files-tools";
import { registerCalendarTools, parseCalendarConfig } from "@dav-worker/calendar-tools";
import { parseFilesConfig } from "@dav-worker/files-locations";
import { createNextcloudWebDAVStorage, createNextcloudCalDAVStorage } from "@dav-worker/storage-nextcloud";
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

// If no config path is given, fall back to the bundled fixture in
// fixtures/ (read straight off local disk) instead of hitting Nextcloud at
// all — lets someone try this out before they've put real config files on
// their Nextcloud yet.
async function loadConfig(
  envVar: string,
  fixtureName: string,
  fileStorage: { read(path: string): Promise<{ content: string }> },
): Promise<string> {
  const path = process.env[envVar];
  if (path) {
    return (await fileStorage.read(path)).content;
  }
  return readFile(join(moduleDir, "fixtures", fixtureName), "utf-8");
}

async function main(): Promise<void> {
  const credential = {
    host: requireEnv("NEXTCLOUD_HOST"),
    username: requireEnv("NEXTCLOUD_USERNAME"),
    password: requireEnv("NEXTCLOUD_PASSWORD"),
  };
  const fileStorage = createNextcloudWebDAVStorage(credential);
  const calendarStorage = createNextcloudCalDAVStorage(credential);

  const [locationsContent, calendarsContent] = await Promise.all([
    loadConfig("LOCATIONS_CONFIG_PATH", "locations.toml", fileStorage),
    loadConfig("CALENDARS_CONFIG_PATH", "calendars.toml", fileStorage),
  ]);
  const filesConfig = parseFilesConfig(locationsContent);
  const calendarConfig = parseCalendarConfig(calendarsContent);

  const server = new McpServer({ name: "dav-worker-local", version: "0.1.0" });
  registerFileTools(server, { storage: fileStorage, config: filesConfig });
  registerCalendarTools(server, { storage: calendarStorage, config: calendarConfig });

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
