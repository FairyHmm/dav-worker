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
      // A name that's entirely non-alphanumeric (e.g. "!!!") slugifies to
      // "". davPath(basePath, "") resolves to basePath itself (the
      // calendars home collection), not a 404 — so this must be rejected
      // before it ever reaches storage, or list_create/list_delete could
      // target the account's calendars root instead of a real list.
      if (slug === "") {
        return err(
          new Error(`"${name}" has no usable characters for a list name. Use letters or numbers.`),
        );
      }
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
