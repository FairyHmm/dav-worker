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

  // ── nc_files_read ───────────────────────────────────────────────────────────
  server.tool(
    "nc_files_read",
    "Read a text file from the Nextcloud vault. Returns an error for binary files.",
    { path: z.string().describe("Vault-relative path to the file (e.g. 'Documents/notes.md')") },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        const { content } = await client.read(path);
        return ok(content);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── nc_files_write ──────────────────────────────────────────────────────────
  server.tool(
    "nc_files_write",
    "Write text content to a file in the Nextcloud vault. Creates the file if it does not exist; overwrites if it does.",
    {
      path: z.string().describe("Vault-relative path to the file (e.g. 'Documents/notes.md')"),
      content: z.string().describe("Text content to write"),
    },
    async ({ path, content }) => {
      try {
        const client = new WebDAVClient(env);
        const { created } = await client.write(path, content);
        return ok(created ? `Created: ${path}` : `Updated: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── nc_files_create_folder ──────────────────────────────────────────────────
  server.tool(
    "nc_files_create_folder",
    "Create a folder in the Nextcloud vault. Succeeds silently if the folder already exists.",
    { path: z.string().describe("Vault-relative path for the new folder (e.g. 'Documents/NewFolder')") },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        const { alreadyExists } = await client.mkdir(path);
        return ok(alreadyExists ? `Already exists: ${path}` : `Created: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── nc_files_delete ─────────────────────────────────────────────────────────
  server.tool(
    "nc_files_delete",
    "Delete a file or folder from the Nextcloud vault. No-ops silently if the path does not exist.",
    { path: z.string().describe("Vault-relative path to delete (e.g. 'Documents/old-note.md')") },
    async ({ path }) => {
      try {
        const client = new WebDAVClient(env);
        await client.delete(path);
        return ok(`Deleted: ${path}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
