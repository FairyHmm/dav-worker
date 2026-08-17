import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineResource, type ToolEntry } from "@dav-worker/mcp-utils";
// Inlined at build time by esbuild's text loader (app/worker's build.mts).
// Requires the ui-config SPA to be built first — see ui/config's `pnpm build`.
import configHtml from "@dav-worker/ui-config/dist/index.html";

export function registerResources(server: McpServer, tools: ToolEntry[]): void {
  // Inject runtime tool list before </head> so the SPA can read
  // window.__mcp_tools__ without a tool call.
  const script = `<script>window.__mcp_tools__=${JSON.stringify(tools)}</script>`;
  const html = configHtml.replace("</head>", `${script}</head>`);
  defineResource(server, "config", html);
}
