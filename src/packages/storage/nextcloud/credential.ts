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

export function asNextcloudCredential(
  credential: unknown,
): NextcloudCredential {
  // Runtime trust boundary: `Credential` arrives as `unknown` from
  // `auth/upstream`. Validate shape to fail fast on bad credentials.
  if (typeof credential !== "object" || credential === null) {
    throw new Error("Invalid credential: expected an object");
  }
  const { host, username, password } = credential as Record<string, unknown>;
  if (typeof host !== "string" || host === "") {
    throw new Error("Invalid credential: host is required");
  }
  if (typeof username !== "string" || username === "") {
    throw new Error("Invalid credential: username is required");
  }
  if (typeof password !== "string" || password === "") {
    throw new Error("Invalid credential: password is required");
  }
  return { host, username, password };
}

export function basicAuthHeader(credential: NextcloudCredential): string {
  return "Basic " + btoa(`${credential.username}:${credential.password}`);
}
