import type { McpServer } from "@modelcontextprotocol/server";
import { defineResource, type ToolEntry } from "@dav-worker/mcp-utils";
import { configHtml } from "@dav-worker/ui-config/dist/asset";

export function registerResources(server: McpServer, tools: ToolEntry[]): void {
  // Bake the tool list into the HTML so the SPA renders it without a tool call.
  const script = `<script>window.__mcp_tools__=${JSON.stringify(tools)}</script>`;

  // Loop kept so adding another UI is a one-line append to this array.
  const apps = [["config", configHtml]] as const;

  for (const [ui, html] of apps) {
    defineResource(server, ui, html, script);
  }
}
