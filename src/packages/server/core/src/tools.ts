import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
import { registerConfigTools } from "@dav-worker/config-tools";
import { parseAppConfig } from "@dav-worker/config-parser";
import {
  parseCalendar,
  findAllComponents,
  getDateTime,
  basicToIso,
} from "@dav-worker/calendar-ical";
import { withParentDirWrite } from "@dav-worker/storage-nextcloud";
import type { Storages } from "./storage";

export async function registerTools(
  server: McpServer,
  storages: Storages,
  configContent: string,
  configPath: string | undefined,
): Promise<void> {
  const { raw } = parseAppConfig(configContent);
  const filesConfig = buildFilesConfig(raw.locations);
  const calendarConfig = parseCalendarConfig(raw.calendars);

  // Tasks only carry a UID; this searches all configured calendars for the
  // matching VEVENT to read its DTSTART (SPEC-MONOREPO.md A.7).
  const resolveEventDue = async (eventId: string): Promise<string | null> => {
    const { found } = await findEventAcrossCalendars(
      storages.calendar,
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

  registerFileTools(
    server,
    { storage: storages.file, config: filesConfig },
    raw.disabled,
  );
  registerCalendarTools(
    server,
    { storage: storages.calendar, config: calendarConfig },
    raw.disabled,
  );
  registerTaskTools(
    server,
    {
      storage: storages.task,
      resolveEventDue,
      resolveCategoryColor: (category) => resolveCategoryColor(calendarConfig, category),
      categories: allCategories(calendarConfig),
    },
    raw.disabled,
  );
  if (configPath) {
    registerConfigTools(
      server,
      { storage: withParentDirWrite(storages.file), path: configPath },
      raw.disabled,
    );
  }
}
