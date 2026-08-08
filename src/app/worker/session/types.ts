// No grant store — every token is self-contained (see ../auth.ts), living
// only encrypted in the client's hands, never server-side.
export interface SessionProps {
  credential: { host: string; username: string; password: string };
  configs: {
    // Single path to the merged config.toml (SPEC-CONFIG.md).
    path: string;
  };
}

export interface Env {
  TOKEN_KEY: string;
}
