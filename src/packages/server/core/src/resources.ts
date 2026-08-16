import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineResource } from "@dav-worker/mcp-utils";
// Inlined at build time by esbuild's text loader (app/worker's build.mts).
// Requires the ui-config SPA to be built first — see ui/config's `pnpm build`.
import configHtml from "@dav-worker/ui-config/dist/index.html";

export function registerResources(server: McpServer): void {
  defineResource(server, "config", configHtml);
}
