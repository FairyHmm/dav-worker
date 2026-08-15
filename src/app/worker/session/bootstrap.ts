import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { registerFileTools } from "@dav-worker/files-tools";
import { buildFilesConfig } from "@dav-worker/files-locations";
import {
  registerCalendarTools,
  parseCalendarConfig,
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
  ensureParentDir,
} from "@dav-worker/storage-nextcloud";
import type { SessionProps } from "./types";

async function loadConfig(
  path: string,
  fileStorage: {
    read(path: string): Promise<{ content: string }>;
    write(path: string, content: string): Promise<unknown>;
    mkdir(path: string): Promise<unknown>;
  },
): Promise<string> {
  try {
    return (await fileStorage.read(path)).content;
  } catch (err) {
    if (!(err instanceof WebDAVHttpError && err.status === 404)) throw err;
  }
  // Write the bootstrap default back so config_get/direct edits see a real
  // file on first connect, not just an implied empty state.
  await ensureParentDir(path, fileStorage);
  await fileStorage.write(path, "");
  return "";
}

export async function createServer(props: SessionProps): Promise<McpServer> {
  // Ajv (SDK default) uses `new Function` at runtime, which workerd disallows.
  const server = new McpServer(
    { name: "dav-worker", version: "0.1.0" },
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );

  const fileStorage = createNextcloudWebDAVStorage(props.credential);
  const calendarStorage = createNextcloudCalDAVStorage(props.credential);
  const taskStorage = createNextcloudCalDAVTaskStorage(props.credential);

  const configContent = await loadConfig(props.configs.path, fileStorage);
  const { raw } = parseAppConfig(configContent);
  const filesConfig = buildFilesConfig(raw.locations);
  const calendarConfig = parseCalendarConfig(raw.calendars);

  // Sole sanctioned cross-domain edge into calendar data (SPEC-MONOREPO.md
  // A.7): tasks only have a UID, so this searches all calendars for it.
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
    // Detached RECURRENCE-ID overrides can sit alongside the master VEVENT —
    // DTSTART must come from the master, not an override.
    const master = findMasterEvent(events) ?? events[0];
    if (!master) return null;
    const dt = getDateTime(master, "DTSTART");
    if (!dt) return null;
    return basicToIso(dt.raw);
  };

  const resolveCategoryColorFn = (category: string): string =>
    resolveCategoryColor(calendarConfig, category);

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

  return server;
}
