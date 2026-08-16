// MCP tools are called via the host bridge injected into the page.
// The host exposes window.__mcp_call__(name, args) → Promise<string>.
export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const bridge = (window as unknown as Record<string, unknown>).__mcp_call__;
  if (typeof bridge !== "function") {
    throw new Error("MCP bridge not available");
  }
  return (bridge as (n: string, a: unknown) => Promise<unknown>)(name, args);
}
