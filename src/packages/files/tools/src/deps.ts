import type { FileStorage } from "@dav-worker/files-contracts";
import type { FilesConfig } from "@dav-worker/files-locations";

// What a platform (app/worker, app/local) must supply to
// registerFileTools — a conforming FileStorage implementation, the
// session's resolved FilesConfig (TODO-MONOREPO 9e — fetched once per
// request by the platform, not re-fetched per tool call), and nothing
// else platform-specific (no Env, no KV, no Cloudflare bindings). Mirrors
// calendar/tools' CalendarToolsDeps (SPEC-MONOREPO.md A.5).
export interface FileToolsDeps {
  storage: FileStorage;
  config: FilesConfig;
}
