import type { TaskStorage, TaskEntry } from "@dav-worker/task-contracts";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";

export interface FindTaskResult {
  found: { list: string; entry: TaskEntry } | null;
  // Lists that 404'd during the search (deleted collection, race with a
  // concurrent list_delete, etc.) — mirrors calendar/tools' find.ts:
  // these don't abort the search, but silently hiding them would make a
  // real "not found" indistinguishable from "we skipped the list it's
  // actually in".
  warnings: string[];
}

function listWarning(list: string): string {
  return `Task list "${list}" returned 404 (may have just been deleted). Skipped for this search.`;
}

// task_update/task_delete take only an id (CalDAV UID) — no list — per
// SPEC-TASKS.md. Unlike calendar's findEventAcrossCalendars, there's no
// static config to enumerate: lists are discovered fresh via
// storage.listAll() every call, since a list can be created/deleted at
// any time and there's no lists.toml to go stale.
export async function findTaskAcrossLists(
  storage: TaskStorage,
  uid: string,
): Promise<FindTaskResult> {
  const warnings: string[] = [];
  const lists = await storage.listAll();

  for (const { slug } of lists) {
    try {
      const entry = await storage.findByUid(slug, uid);
      if (entry) return { found: { list: slug, entry }, warnings };
    } catch (e) {
      if (e instanceof WebDAVHttpError && e.status === 404) {
        warnings.push(listWarning(slug));
        continue;
      }
      throw e;
    }
  }
  return { found: null, warnings };
}

// Shared "⚠️ ..." prefix, same convention as calendar/tools' find.ts.
export function formatWarnings(warnings: string[]): string {
  return warnings.length ? `⚠️ ${warnings.join(" ")}\n\n` : "";
}
