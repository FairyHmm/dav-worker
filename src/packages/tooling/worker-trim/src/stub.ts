// Bundler-agnostic helpers shared by both plugins; resolution mechanics stay
// in each plugin since the bundler APIs aren't unifiable.
export interface StubTarget {
  name: string;
  resolveFrom: string;
  stub: string | (() => unknown);
}

export const STUB_NAMESPACE = "worker-trim-stub";
export const STUB_ID_PREFIX = `${STUB_NAMESPACE}:`;

// resolveFrom supports deep specifiers, unlike Wrangler's `alias`, which only
// matches whole package names. Function stubs are .toString()'d, never
// invoked, so they must be self-contained; use a string for non-function snippets.
export function stubId(target: StubTarget): string {
  return `${STUB_ID_PREFIX}${target.name}`;
}

export function findStub(
  targets: StubTarget[],
  id: string,
): StubTarget | undefined {
  return targets.find((t) => stubId(t) === id);
}

export function isRelative(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

// Bare specifiers resolve identically from any importer, so a flat map is safe.
// Relative specifiers are importer-relative - two packages can share the same
// file path - so the caller must resolve those per-importer, never by text.
export function partitionStubs(targets: StubTarget[]): {
  bareBySpecifier: Map<string, StubTarget>;
  relativeTargets: StubTarget[];
} {
  const bareBySpecifier = new Map(
    targets
      .filter((t) => !isRelative(t.resolveFrom))
      .map((t) => [t.resolveFrom, t]),
  );
  const relativeTargets = targets.filter((t) => isRelative(t.resolveFrom));
  return { bareBySpecifier, relativeTargets };
}

export function stubContents(target: StubTarget): string {
  return typeof target.stub === "string"
    ? target.stub
    : `export ${target.stub.toString()}`;
}
