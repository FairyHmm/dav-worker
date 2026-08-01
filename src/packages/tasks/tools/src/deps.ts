import type { TaskStorage } from "@dav-worker/task-contracts";

// What a platform (app/worker, app/local) must supply to registerTaskTools.
// No TaskConfig/category map anymore (SPEC-TASKS.md) — `list` is a
// free-form slug the caller discovers via list_all, resolved directly
// against storage, not looked up in a config file.
//
// resolveEventDue is the one sanctioned cross-domain edge into calendar
// data (mirrors auth/upstream, SPEC-MONOREPO.md A.7): task_create/
// task_update ask "what's this event's due-equivalent start?" and get an
// ISO string back, or null if the event's gone. Wired by app/worker to the
// real calendar storage; tasks/tools itself never imports calendar-* code.
// resolveCategoryColor mirrors resolveEventDue: the one other sanctioned
// cross-domain edge into calendar data (SPEC-MONOREPO.md A.7). list_create
// asks "does this calendar category have a color?" and gets its hex string
// back — color is required per calendars.csv row now (category, slug, color
// are all mandatory unique key fields), so this only fails for an unknown
// category, never a known-category-no-color case. `categories` is the
// known-category list itself (calendars.csv's category column), given
// separately so list_create can validate its `category` param up front and
// produce a clear "unknown category" message before ever calling
// resolveCategoryColor.
export interface TaskToolsDeps {
  storage: TaskStorage;
  resolveEventDue: (eventId: string) => Promise<string | null>;
  resolveCategoryColor: (category: string) => string;
  categories: string[];
}

// Shared by list_create and list_all: both take an optional `category`
// and need the exact same "reject with the known-category list, else
// resolve to the row's color" step before doing anything else — creating
// a collection with that color, or filtering listAll()'s results by it.
// Membership is checked against `deps.categories` up front (not just
// caught from resolveCategoryColor's own throw) so the error message is
// produced before either call site's own side effect — MKCOL vs. the
// listAll() round-trip — runs against a category that could never work.
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
