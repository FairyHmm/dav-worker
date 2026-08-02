import type { TaskStorage, TaskEntry } from "@dav-worker/task-contracts";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";

export interface FindTaskResult {
  found: { list: string; entry: TaskEntry } | null;
  // 404'd lists during the search — kept, not swallowed, so "not found"
  // can't be hiding a list we actually skipped.
  warnings: string[];
}

function listWarning(list: string): string {
  return `Task list "${list}" returned 404 (may have just been deleted). Skipped for this search.`;
}

// Lists discovered fresh via storage.listAll() every call — no static
// config to go stale, unlike calendar's findEventAcrossCalendars.
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
