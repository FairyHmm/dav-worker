// Opaque outside the Nextcloud adapter: `auth/upstream` can't import
// Nextcloud-specific types (SPEC-MONOREPO.md Layer 2), so it can't know
// the concrete shape. Only `storage/nextcloud/*` may cast this.
export type Credential = unknown;

// Interface only, no KV/D1 import — worker/local inject different concrete
// stores, kept invisible to calendar/* and files/*.
export interface TokenStore {
  // Null means no credential yet (unlinked or revoked).
  get(sessionId: string): Promise<Credential | null>;

  set(sessionId: string, credential: Credential): Promise<void>;

  delete(sessionId: string): Promise<void>;
}
