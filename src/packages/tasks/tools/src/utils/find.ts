import type { TaskStorage, TaskEntry } from "@dav-worker/task-contracts";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";

export { formatWarnings } from "@dav-worker/mcp-utils";

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
// Searches all lists in parallel for better latency.
export async function findTaskAcrossLists(
  storage: TaskStorage,
  uid: string,
): Promise<FindTaskResult> {
  const lists = await storage.listAll();

  const results = await Promise.allSettled(
    lists.map(async ({ slug }) => {
      const entry = await storage.findByUid(slug, uid);
      return { slug, entry };
    }),
  );

  const warnings: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const slug = lists[i].slug;
    if (result.status === "fulfilled" && result.value.entry) {
      return {
        found: { list: result.value.slug, entry: result.value.entry },
        warnings,
      };
    }
    if (result.status === "rejected") {
      if (
        result.reason instanceof WebDAVHttpError &&
        result.reason.status === 404
      ) {
        warnings.push(listWarning(slug));
      } else {
        throw result.reason;
      }
    }
  }

  return { found: null, warnings };
}
