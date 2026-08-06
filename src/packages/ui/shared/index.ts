// Barrel for cross-resource UI concerns: design tokens, Tailwind v4
// entry CSS, and shadcn-svelte primitives shared by every ui/* resource
// bundle (file-explorer, tasks, calendar, ...). Resource packages import
// from here rather than duplicating Tailwind config or re-vendoring
// primitives per bundle (mirrors auth/upstream as the one sanctioned
// cross-domain edge on the server side — this is that edge for ui/*).
//
// STUB — not yet implemented. Intended shape, filled in incrementally
// as resource packages need concrete pieces (tokens first, since even
// scaffolding-only resource shells will want to import the CSS entry):
//
//   export { default as tokens } from "./tokens.css";
//   export * as primitives from "./primitives"; // shadcn-svelte, owned source
