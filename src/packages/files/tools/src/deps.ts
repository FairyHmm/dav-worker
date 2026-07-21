import type { FileStorage } from "@dav-worker/files-contracts";

// What a platform (app/worker, app/local) must supply to
// registerFileTools — a conforming FileStorage implementation and nothing
// platform-specific (no Env, no KV, no Cloudflare bindings). Mirrors
// calendar/tools' CalendarToolsDeps (SPEC-MONOREPO.md A.5).
export interface FileToolsDeps {
  storage: FileStorage;
}
