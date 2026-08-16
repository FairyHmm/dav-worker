import { WebDAVHttpError, ensureParentDir } from "@dav-worker/storage-nextcloud";

export type FileStorage = {
  read(path: string): Promise<{ content: string }>;
  write(path: string, content: string): Promise<unknown>;
  mkdir(path: string): Promise<unknown>;
};

// Reads config from `path` in Nextcloud. If the file doesn't exist yet,
// creates it empty and returns "". When path is absent, falls back to the
// provided fallback (e.g. a bundled fixture for local dev).
export async function loadConfig(
  path: string | undefined,
  fileStorage: FileStorage,
  fallback: () => Promise<string> = () => Promise.resolve(""),
): Promise<string> {
  if (!path) return fallback();
  try {
    return (await fileStorage.read(path)).content;
  } catch (err) {
    if (!(err instanceof WebDAVHttpError && err.status === 404)) throw err;
  }
  // Write the bootstrap default back so config_get/direct edits see a real
  // file on first connect, not just an implied empty state.
  await ensureParentDir(path, fileStorage);
  await fileStorage.write(path, "");
  return "";
}
