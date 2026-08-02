import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { resolveKnownCategoryColor } from "../deps";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import { ok, err } from "../utils";
import { ListNameSchema, ListCategorySchema } from "../utils/schemas";
import {
  withBatchSupport,
  runBatchTool,
  required,
  type Resolved,
} from "@dav-worker/batch-core";

// name -> slug: lowercase, collapse non-alphanumeric runs to "-", trim
// leading/trailing "-" (SPEC-TASKS.md), e.g. "Personal Tasks!" -> "personal-tasks".
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createItemShape() {
  return {
    // required(): each list needs its own name — nothing to inherit
    // from a top-level default the way task_create's `list` can.
    name: required(ListNameSchema),
    category: ListCategorySchema,
  };
}

type CreateItem = Resolved<ReturnType<typeof createItemShape>, "name">;

export function registerListCreateTool(
  server: McpServer,
  deps: TaskToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
    "list_create",
    {
      description: "Create a new task list.",
      annotations: {
        title: "Create Task List",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(params, itemShape, err, (item: CreateItem) =>
        createListItem(deps, item),
      ),
  );
}

async function createListItem(deps: TaskToolsDeps, item: CreateItem) {
  const { name, category } = item;
  const slug = slugify(name);
  // A name that's entirely non-alphanumeric (e.g. "!!!") slugifies
  // to "". davPath(basePath, "") resolves to basePath itself (the
  // calendars home collection), not a 404 — so this must be
  // rejected before it ever reaches storage, or list_create/
  // list_delete could target the account's calendars root instead
  // of a real list.
  if (slug === "") {
    return err(
      new Error(
        `"${name}" has no usable characters for a list name. Use letters or numbers.`,
      ),
    );
  }
  // category is validated here, not at the Zod level — it's a
  // free-form string schema (ListCategorySchema) because the set
  // of valid categories is per-session config (calendars.csv),
  // not knowable at schema-definition time. resolveKnownCategoryColor
  // (deps.ts, shared with list_all) throws with the full
  // known-category list on a miss, same style as
  // resolveCalendarName's "Unknown category" error in
  // calendar/tools.
  let color: string | undefined;
  if (category !== undefined) {
    try {
      color = resolveKnownCategoryColor(deps, category);
    } catch (e) {
      return err(e);
    }
  }
  try {
    await deps.storage.listCreate(slug, color);
    return ok(`Created task list "${slug}".`);
  } catch (e) {
    // No pre-check — MKCOL on an existing collection path fails
    // naturally (405/409-class). storage.listCreate already
    // disambiguates the trashbin case (a real <deleted-calendar/>
    // marker, confirmed via a follow-up PROPFIND) and throws a
    // plain Error with its own actionable message for that — pass
    // that through unrewrapped. What's left as a genuine
    // WebDAVHttpError 405/409 here is the live-collision case,
    // which is unambiguous: rewrap only that into "already exists"
    // (SPEC-TASKS.md).
    if (
      e instanceof WebDAVHttpError &&
      (e.status === 405 || e.status === 409)
    ) {
      return err(new Error(`Task list "${slug}" already exists.`));
    }
    return err(e);
  }
}
