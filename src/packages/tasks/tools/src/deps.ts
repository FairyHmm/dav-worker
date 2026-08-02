import type { TaskStorage } from "@dav-worker/task-contracts";

// `list` is a free-form slug discovered via list_all, resolved directly
// against storage — no TaskConfig/category map (SPEC-TASKS.md).
//
// resolveEventDue/resolveCategoryColor are the two sanctioned
// cross-domain edges into calendar data (mirrors auth/upstream,
// SPEC-MONOREPO.md A.7) — tasks/tools itself never imports calendar-*
// code, app/worker wires these to the real calendar storage.
export interface TaskToolsDeps {
  storage: TaskStorage;
  // Returns the event's due-equivalent start as ISO, or null if gone.
  resolveEventDue: (eventId: string) => Promise<string | null>;
  // Color is mandatory per calendars.csv row, so this only fails for an
  // unknown category, never a known-category-no-color case.
  resolveCategoryColor: (category: string) => string;
  // calendars.csv's category column, given separately so callers can
  // validate `category` up front (see resolveKnownCategoryColor).
  categories: string[];
}

// Shared by list_create/list_all: reject against `deps.categories` up
// front, before either call site's own side effect (MKCOL vs. the
// listAll() round-trip) runs against a category that could never work.
export function resolveKnownCategoryColor(
  deps: TaskToolsDeps,
  category: string,
): string {
  if (!deps.categories.includes(category)) {
    throw new Error(
      `Unknown category "${category}". Known categories: ${deps.categories.join(", ")}`,
    );
  }
  return deps.resolveCategoryColor(category);
}
