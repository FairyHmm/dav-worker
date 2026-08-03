import type { TaskStorage } from "@dav-worker/task-contracts";

// tasks/tools never imports calendar-* code (SPEC-MONOREPO.md A.7); these
// two fields are its only edge into calendar data, wired by app/worker.
export interface TaskToolsDeps {
  storage: TaskStorage;
  resolveEventDue: (eventId: string) => Promise<string | null>;
  resolveCategoryColor: (category: string) => string;
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
