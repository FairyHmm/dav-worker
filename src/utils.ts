export const text = (t: string) => ({ type: "text" as const, text: t });
export const ok = (t: string) => ({ content: [text(t)] });
export const err = (e: unknown) => ({
  content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)],
  isError: true,
});
