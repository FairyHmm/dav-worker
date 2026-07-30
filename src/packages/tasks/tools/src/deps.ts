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
export interface TaskToolsDeps {
  storage: TaskStorage;
  resolveEventDue: (eventId: string) => Promise<string | null>;
}
