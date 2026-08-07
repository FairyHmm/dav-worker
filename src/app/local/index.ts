// Local dev composition root, independent of app/worker (SPEC-MONOREPO.md
// step 10). No OAuth round-trip — reads credential + config path from env
// vars and serves stdio directly, no consent screen or token exchange.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFileTools } from "@dav-worker/files-tools";
import {
  registerCalendarTools,
  resolveCategoryColor,
  allCategories,
  findEventAcrossCalendars,
  findMasterEvent,
} from "@dav-worker/calendar-tools";
import { registerTaskTools } from "@dav-worker/task-tools";
import { parseAppConfig } from "@dav-worker/config-parser";
import {
  parseCalendar,
  findAllComponents,
  getDateTime,
  basicToIso,
} from "@dav-worker/calendar-ical";
import {
  createNextcloudWebDAVStorage,
  createNextcloudCalDAVStorage,
  createNextcloudCalDAVTaskStorage,
  WebDAVHttpError,
} from "@dav-worker/storage-nextcloud";
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

// Parent-dir 404s (e.g. /.config not existing yet) are routine on a fresh
// account — mkdir treats "already exists" as a non-error itself.
async function ensureParentDir(
  path: string,
  fileStorage: { mkdir(path: string): Promise<unknown> },
): Promise<void> {
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (dir) await fileStorage.mkdir(dir);
}

// Falls back to the bundled fixture if no path is given, so this is
// runnable before real config files exist on Nextcloud.
async function loadConfig(
  envVar: string,
  fixtureName: string,
  fileStorage: {
    read(path: string): Promise<{ content: string }>;
    write(path: string, content: string): Promise<unknown>;
    mkdir(path: string): Promise<unknown>;
  },
): Promise<string> {
  const path = process.env[envVar];
  if (!path) return readFile(join(moduleDir, "fixtures", fixtureName), "utf-8");
  try {
    return (await fileStorage.read(path)).content;
  } catch (err) {
    if (!(err instanceof WebDAVHttpError && err.status === 404)) throw err;
  }
  await ensureParentDir(path, fileStorage);
  await fileStorage.write(path, "");
  return "";
}

async function main(): Promise<void> {
  const credential = {
    host: requireEnv("NEXTCLOUD_HOST"),
    username: requireEnv("NEXTCLOUD_USERNAME"),
    password: requireEnv("NEXTCLOUD_PASSWORD"),
  };
  const fileStorage = createNextcloudWebDAVStorage(credential);
  const calendarStorage = createNextcloudCalDAVStorage(credential);
  const taskStorage = createNextcloudCalDAVTaskStorage(credential);

  const configContent = await loadConfig(
    "CONFIG_PATH",
    "config.toml",
    fileStorage,
  );
  const { locations: filesConfig, calendars: calendarConfig } =
    parseAppConfig(configContent);

  // Mirrors app/worker/index.ts's resolveEventDue (SPEC-MONOREPO.md A.7).
  const resolveEventDue = async (eventId: string): Promise<string | null> => {
    const { found } = await findEventAcrossCalendars(
      calendarStorage,
      calendarConfig,
      "VEVENT",
      eventId,
    );
    if (!found?.entry.calendarData) return null;
    const cal = parseCalendar(found.entry.calendarData);
    const events = findAllComponents(cal, "VEVENT");
    const master = findMasterEvent(events) ?? events[0];
    if (!master) return null;
    const dt = getDateTime(master, "DTSTART");
    if (!dt) return null;
    return basicToIso(dt.raw);
  };

  // Mirrors app/worker/index.ts's resolveCategoryColor wiring.
  const resolveCategoryColorFn = (category: string): string =>
    resolveCategoryColor(calendarConfig, category);

  const server = new McpServer({ name: "dav-worker-local", version: "0.1.0" });
  registerFileTools(server, { storage: fileStorage, config: filesConfig });
  registerCalendarTools(server, {
    storage: calendarStorage,
    config: calendarConfig,
  });
  registerTaskTools(server, {
    storage: taskStorage,
    resolveEventDue,
    resolveCategoryColor: resolveCategoryColorFn,
    categories: allCategories(calendarConfig),
  });

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
