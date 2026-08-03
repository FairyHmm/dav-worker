import type { FileStorage } from "@dav-worker/files-contracts";
import type { FilesConfig } from "@dav-worker/files-locations";

// config is resolved once per request by the platform (TODO-MONOREPO 9e),
// not re-fetched per tool call. Mirrors calendar/tools' CalendarToolsDeps
// (SPEC-MONOREPO.md A.5).
export interface FileToolsDeps {
  storage: FileStorage;
  config: FilesConfig;
}
