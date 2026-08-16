export const text = (t: string) => ({ type: "text" as const, text: t });

export const ok = (t: string) => ({ content: [text(t)] });

export const err = (e: unknown) => ({
  content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)],
  isError: true,
});

export function formatWarnings(warnings: string[]): string {
  return warnings.length ? `⚠️ ${warnings.join(" ")}\n\n` : "";
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
