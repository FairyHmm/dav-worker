import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { TaskToolsDeps } from "../deps";
import { resolveKnownCategoryColor } from "../deps";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import { ok, err, defineTool } from "@dav-worker/mcp-utils";
import { slugify } from "../utils/slugify";
import { ListNameSchema, ListCategorySchema } from "../utils/schemas";
import { required, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    name: required(ListNameSchema),
    category: ListCategorySchema,
  };
}

type CreateItem = Resolved<ReturnType<typeof createItemShape>, "name">;

export function registerListCreateTool(
  server: McpServer,
  deps: TaskToolsDeps,
  disabled: DisabledShape,
): void {
  defineTool(
    server,
    "tasks",
    disabled,
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
      itemShape: createItemShape(),
    },
    (item: CreateItem) => createListItem(deps, item),
  );
}

async function createListItem(deps: TaskToolsDeps, item: CreateItem) {
  const { name, category } = item;
  const slug = slugify(name);
  // "" resolves to the calendars home collection, not a 404 — must reject.
  if (slug === "") {
    return err(
      new Error(
        `"${name}" has no usable characters for a list name. Use letters or numbers.`,
      ),
    );
  }
  // Category set isn't known until request time (calendars.csv), so
  // validated here, not at the Zod level.
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
    // Trashbin collisions are already disambiguated by storage.listCreate
    // (its own thrown Error) — only rewrap a genuine live collision.
    if (
      e instanceof WebDAVHttpError &&
      (e.status === 405 || e.status === 409)
    ) {
      return err(new Error(`Task list "${slug}" already exists.`));
    }
    return err(e);
  }
}
