// Dev-only MCP bridge. Installs window.__mcp_call__ by talking directly to
// the local HTTP server (/mcp) using JSON-RPC over SSE — no SDK needed.
// Imported only when import.meta.env.DEV is true; tree-shaken from prod builds.

const MCP_URL = "/mcp";
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

let _id = 0;
function nextId() {
  return ++_id;
}

// Responses come back as SSE: "event: message\ndata: {...}\n\n".
// We only need the first data line.
async function parseSSE(res: Response): Promise<unknown> {
  const text = await res.text();
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6));
    }
  }
  throw new Error(`MCP dev bridge: no data line in SSE response:\n${text}`);
}

async function rpc(method: string, params: unknown): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId(), method, params }),
  });
  if (!res.ok) throw new Error(`MCP dev bridge: HTTP ${res.status}`);
  return parseSSE(res);
}

export async function installDevBridge(): Promise<void> {
  // Handshake required by the transport before any tool call.
  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "dev-bridge", version: "0" },
  });

  // Populate window.__mcp_tools__ so the UI can read it the same way it does
  // in production (where registerResources injects it as a script tag).
  // category is stored in annotations by defineTool so tools/list carries it.
  const tlEnvelope = await rpc("tools/list", {});
  const tlMsg = tlEnvelope as {
    result?: { tools?: { name: string; annotations?: { category?: string } }[] };
  };
  const tools = (tlMsg.result?.tools ?? []).map((t) => ({
    name: t.name,
    category: t.annotations?.category ?? "",
  }));
  (window as unknown as Record<string, unknown>).__mcp_tools__ = tools;

  (window as unknown as Record<string, unknown>).__mcp_call__ = async (
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> => {
    // Each call re-initializes — the local server is stateless per request.
    await rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "dev-bridge", version: "0" },
    });
    const envelope = await rpc("tools/call", { name, arguments: args });
    const msg = envelope as {
      result?: { content?: { text?: string }[]; isError?: boolean };
    };
    const text = msg.result?.content?.[0]?.text ?? null;
    // Surface MCP-level errors as thrown exceptions so callers get a proper
    // rejection rather than trying to JSON.parse an "Error: ..." string.
    if (msg.result?.isError) throw new Error(text ?? "MCP tool error");
    return text;
  };
}
