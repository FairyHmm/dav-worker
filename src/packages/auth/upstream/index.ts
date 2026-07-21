// Credential is opaque outside the Nextcloud adapter that produces/consumes
// it — everything else (tools/, contracts/) only ever passes it through.
// Declared as `unknown` here deliberately: `auth/upstream` must not import
// anything Nextcloud-specific (SPEC-MONOREPO.md's Layer 2 constraint), so it
// cannot know the concrete shape (host/username/password today, OAuth token
// tomorrow). `storage/nextcloud/*` is the only package allowed to cast this
// to its real shape.
export type Credential = unknown;

// TokenStore is an interface only — no KV/D1 import here. `app/worker`
// injects a concrete KV-backed implementation; `app/local` injects a
// fixture implementation reading `.dev.vars`. Both call the same tool
// registrations, so neither implementation is visible to `calendar/*` or
// `files/*`.
export interface TokenStore {
  // Resolves a signed-in session to the Credential that
  // `storage/nextcloud/*` needs to act on that user's behalf. Returns null
  // if there's no stored credential for this session (not yet linked, or
  // revoked).
  get(sessionId: string): Promise<Credential | null>;

  // Stores/overwrites the credential for a session (e.g. after a successful
  // upstream OAuth or basic-auth linking flow).
  set(sessionId: string, credential: Credential): Promise<void>;

  // Removes a stored credential (disconnect / revoke).
  delete(sessionId: string): Promise<void>;
}
