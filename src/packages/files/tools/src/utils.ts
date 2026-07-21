// Deliberately duplicated (not shared) — see SPEC-MONOREPO.md A.7: the only
// sanctioned cross-domain edge is auth/upstream's Credential/TokenStore.
// This is a 6-line MCP response-shape helper, not a domain concern.
export const text = (t: string) => ({ type: "text" as const, text: t });
export const ok = (t: string) => ({ content: [text(t)] });
export const err = (e: unknown) => ({
  content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)],
  isError: true,
});
