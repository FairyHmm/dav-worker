// Barrel — mirrors every other package's index.ts (files-tools,
// calendar-ical, etc). What the worker actually needs from this package
// isn't a TS import though: it's the *built* single-file HTML output
// (dist/index.html after `pnpm --dir src/packages/ui/file-explorer build`)
// served as the ui://file-explorer MCP Apps resource. This file exists
// so the package is a well-formed workspace member and has a stable
// import surface if/when one is needed (e.g. a resourceUri constant).
//
// STUB — nothing to export yet.
export {};
