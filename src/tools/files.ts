import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebDAVClient } from "../clients/webdav.js";
import { ok, err } from "../utils.js";

export function registerFilesTools(server: McpServer, env: Env): void {
  // ── nc_files_list ───────────────────────────────────────────────────────────
  server.tool(
    "nc_files_list",
    "List files and folders at a path in the Nextcloud vault. Use an empty string or '/' for the root.",
    { path: z.string().describe("Vault-relative path (e.g. 'Documents' or '')") },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        const entries = await client.list(path);

        if (entries.length === 0) return ok("Directory is empty.");

        const lines = entries.map((e) => {
          const kind = e.isDirectory ? "DIR " : "FILE";
          const size = e.size != null ? ` (${e.size} bytes)` : "";
          return `${kind}  ${e.name}${size}`;
        });

        return ok(lines.join("\n"));
      } catch (e) {
        return err(e);
      }
    },
  );
}
