import type { McpServer } from "@modelcontextprotocol/server";
import type { CalendarToolsDeps } from "../deps";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import { filterCategorySchema, TimeWindowSchema } from "../utils/schemas";
import { resolveCalendarName, allCalendarNames } from "../calendars";
import { resolveTimeWindow } from "@dav-worker/time-utils";
import { extractEventSummaries } from "../utils/mapping";
import { formatWarnings } from "../utils/find";
import type { EventSummary } from "../utils/mapping";
import type { Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape(deps: CalendarToolsDeps) {
  return {
    time: TimeWindowSchema,
    category: filterCategorySchema(deps.config).optional(),
  };
}

type ListItem = Resolved<ReturnType<typeof createItemShape>, never>;

export function registerScheduleListTool(
  server: McpServer,
  deps: CalendarToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "calendar",
    disabled,
    "schedule_list",
    {
      description: "List calendar events in a time window.",
      annotations: {
        title: "List Events",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      itemShape: createItemShape(deps),
    },
    (item: ListItem) => listEventItem(deps, item),
    undefined,
    collector,
  );
}

async function listEventItem(deps: CalendarToolsDeps, item: ListItem) {
  const { time, category } = item;
  try {
    const { startUtc, endUtc } = resolveTimeWindow(time);
    const client = deps.storage;
    const calendarNames = category
      ? [resolveCalendarName(deps.config, category)]
      : allCalendarNames(deps.config);

    const results: Array<EventSummary & { calendar: string }> = [];
    const warnings: string[] = [];

    for (const calendarName of calendarNames) {
      let entries;
      try {
        entries = await client.listByTimeRange(
          calendarName,
          "VEVENT",
          startUtc,
          endUtc,
        );
      } catch (e) {
        // A stale calendar slug shouldn't take down the rest of an
        // "all calendars" listing.
        if (e instanceof WebDAVHttpError && e.status === 404) {
          warnings.push(
            `Calendar "${calendarName}" returned 404 (its slug in calendars.toml may be ` +
              `stale — check it against the calendar's actual URI on the server, e.g. ` +
              `after a rename). Skipped for this listing.`,
          );
          continue;
        }
        throw e;
      }
      for (const entry of entries) {
        for (const summary of extractEventSummaries(entry)) {
          results.push({ ...summary, calendar: calendarName });
        }
      }
    }

    if (results.length === 0)
      return ok(`${formatWarnings(warnings)}No events found in this window.`);

    const lines = results.map((e) => {
      const idPart = e.occurrence
        ? `id: ${e.uid}, occurrence: ${e.occurrence}`
        : `id: ${e.uid}`;
      return `${e.start} – ${e.end}  ${e.title}  [${e.calendar}]  (${idPart})`;
    });
    return ok(`${formatWarnings(warnings)}${lines.join("\n")}`);
  } catch (e) {
    return err(e);
  }
}
