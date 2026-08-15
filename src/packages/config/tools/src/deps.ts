// Minimal surface, not FileStorage: keeps config/tools backend-agnostic
// (SPEC-CONFIG.md). write() must handle its own parent-dir creation —
// this package does no path handling.
export interface ConfigStorage {
  read(path: string): Promise<{ content: string }>;
  write(path: string, content: string): Promise<unknown>;
}

export interface ConfigToolsDeps {
  storage: ConfigStorage;
  path: string;
}
