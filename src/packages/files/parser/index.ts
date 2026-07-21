// Barrel export for the files/parser package. Format-agnostic block
// read/write dispatch (markdown headings + raw line ranges) — no
// filesystem, no WebDAV, no dav-worker request/response shapes. Ported
// unchanged from src/parser/*.
export * from "./src/markdown/index.js";
export * from "./src/raw/index.js";
export * from "./src/registry.js";
export * from "./src/resolve-target.js";
