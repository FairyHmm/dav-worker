import type { McpServer } from "@modelcontextprotocol/server";
import { defineResource, type ToolEntry } from "@dav-worker/mcp-utils";
import { configHtml } from "@dav-worker/ui-config/dist/asset";

export function registerResources(
  server: McpServer,
  tools: ToolEntry[],
): void {
  // Inject runtime tool list before </head> so the SPA can read
  // window.__mcp_tools__ without a tool call.
  const script = `<script>window.__mcp_tools__=${JSON.stringify(tools)}</script>`;
  const html = configHtml.replace("</head>", `${script}</head>`);
  defineResource(server, "config", html);
}
