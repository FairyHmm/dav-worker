// Registration stub for the File resource's MCP Apps UI (SPEC-UI.md).
// Not wired into app/worker yet — scaffold only. When implemented:
//
// 1. `server.registerResource("ui://file-explorer", ...)` serving the
//    built dist/index.html (viteSingleFile output — one inlined
//    document, per sandbox constraints) with mime type "text/html".
//
// 2. Every dir_*/entry_*/file_* tool registration in files/tools gets
//    `_meta: { ui: { resourceUri: "ui://file-explorer" } }` added to its
//    registerTool() config (see dir/list.ts, file/read.ts, etc.) — one
//    resourceUri shared across all of them, per SPEC-UI.md's "Each
//    resource owns a single UI... many MCP tools" rule. This is a
//    files/tools change, not a change here; file-explorer only owns the
//    UI bundle, not the tool registration.
//
// 3. app/worker's createServer() calls this package's resource
//    registration function alongside registerFileTools(), same wiring
//    point/pattern as registerCalendarTools/registerTaskTools.
//
// STUB — no exports yet. Placeholder signature for the eventual
// registration function:
//
//   export function registerFileExplorerResource(server: McpServer): void

export {};
