// resolveFrom supports deep specifiers (e.g. "zod/v4/locales/index.js"), unlike
// Wrangler's `alias`, which only matches whole package names.
//
// A function stub is serialized via .toString(), never invoked - must be
// self-contained (no closures over outer scope). String stubs are for
// snippets that aren't one function/class body (e.g. "export {};").
export interface StubTarget {
  name: string;
  resolveFrom: string;
  stub: string | (() => unknown);
}
