import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "../deps.js";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import { ok, err } from "../utils.js";
import { ListNameSchema } from "../utils/schemas.js";

// name -> slug: lowercase, collapse non-alphanumeric runs to "-", trim
// leading/trailing "-" (SPEC-TASKS.md), e.g. "Personal Tasks!" -> "personal-tasks".
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function registerListCreateTool(server: McpServer, deps: TaskToolsDeps): void {
  server.registerTool(
    "list_create",
    {
      description:
        "Create a new task list, separate from event calendars.",
      inputSchema: { name: ListNameSchema },
    },
    async ({ name }) => {
      const slug = slugify(name);
      try {
        await deps.storage.listCreate(slug);
        return ok(`Created task list "${slug}".`);
      } catch (e) {
        // No pre-check — MKCALENDAR on an existing collection path fails
        // naturally (405/409-class). Rewrap that specific case into an
        // actionable message; everything else passes through unrewrapped
        // (SPEC-TASKS.md).
        if (e instanceof WebDAVHttpError && (e.status === 405 || e.status === 409)) {
          return err(new Error(`Task list "${slug}" already exists.`));
        }
        return err(e);
      }
    },
  );
}
