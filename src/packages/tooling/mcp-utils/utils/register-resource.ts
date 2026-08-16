import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

// Wraps server.registerResource for MCP Apps UI resources
export function defineResource(
  server: McpServer,
  ui: string,
  text: string,
): void {
  const uri = `ui://${ui}`;

  server.registerResource(uri, uri, { mimeType: "text/html" }, () => ({
    contents: [{ uri, mimeType: "text/html", text }],
  }));
}
