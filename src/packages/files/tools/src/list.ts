import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileToolsDeps } from "./deps.js";
import { ok, err, resolvePath } from "./utils.js";
import { PathSchema, DepthSchema, LocationSchema } from "./schemas.js";

export function registerListTool(server: McpServer, deps: FileToolsDeps): void {
  server.registerTool(
    "nc_files_list",
    {
      description:
        "List files and folders at a path in the Nextcloud vault. Use an empty " +
        "string or '/' for the root. Pass `location` instead of `path` to use " +
        "a named location shortcut.",
      inputSchema: {
        path: PathSchema.optional(),
        location: LocationSchema,
        depth: DepthSchema,
      },
    },
    async ({ path: pathArg, location, depth }) => {
      try {
        const path = resolvePath(deps.config, { path: pathArg, location }, { allowRoot: true });
        const client = deps.storage;
        const entries = await client.list(path, depth);

        if (entries.length === 0) return ok("Directory is empty.");

        const lines = entries.map((e) => {
          const kind = e.isDirectory ? "DIR " : "FILE";
          const size = e.size != null ? ` (${e.size} bytes)` : "";
          const label = depth === 1 ? e.name : e.path;
          return `${kind}  ${label}${size}`;
        });

        return ok(lines.join("\n"));
      } catch (e) {
        return err(e);
      }
    },
  );
}
