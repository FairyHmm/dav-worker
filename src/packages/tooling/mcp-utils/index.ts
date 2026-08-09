// Shared MCP response helpers and utility functions.
// Consolidates duplicated code from files/tools, calendar/tools, and tasks/tools.

// MCP text content block.
export const text = (t: string) => ({ type: "text" as const, text: t });

// MCP success response wrapping text content.
export const ok = (t: string) => ({ content: [text(t)] });

// MCP error response with isError flag.
export const err = (e: unknown) => ({
  content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)],
  isError: true,
});

// Format an array of warning strings with  standard ⚠️ prefix. */
export function formatWarnings(warnings: string[]): string {
  return warnings.length ? `⚠️ ${warnings.join(" ")}\n\n` : "";
}

// Create a JSON Response with the stand content-type header. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
