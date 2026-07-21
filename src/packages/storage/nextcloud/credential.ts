// The concrete shape behind `auth/upstream`'s opaque `Credential`. Only
// this package is allowed to know it (SPEC-MONOREPO.md Layer 2: "only
// storage/nextcloud/* knows the actual shape of a Nextcloud credential").
// Basic-auth today; an OAuth token shape can replace/extend this later
// without `auth/upstream`, `calendar/*`, or `files/*` noticing.
export interface NextcloudCredential {
  host: string;
  username: string;
  password: string;
}

export function asNextcloudCredential(credential: unknown): NextcloudCredential {
  // Runtime trust boundary: `Credential` arrives as `unknown` from
  // `auth/upstream`. A real implementation should validate shape here;
  // deferred until TokenStore has a real backing store to validate against
  // (see SPEC-MONOREPO.md's "Auth lifecycle" open item).
  return credential as NextcloudCredential;
}

export function basicAuthHeader(credential: NextcloudCredential): string {
  return "Basic " + btoa(`${credential.username}:${credential.password}`);
}
