import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import {
  BlockSchema,
  FromSchema,
  ModeSchema,
  PathSchema,
  ScopeSchema,
  ToSchema,
} from "./schemas.js";
import { resolveTarget } from "../../parser/resolve-target.js";

export function registerWriteTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_write",
    "Write text content to a file in the Nextcloud vault. Without `block` or " +
      "`from`/`to`, overwrites (or creates) the whole file. With `block`, " +
      "patches one heading's section (see `scope`/`mode`). With `from`/`to`, " +
      "patches a 1-indexed line range (see `mode`). `block` and `from`/`to` " +
      "are mutually exclusive.",
    {
      path: PathSchema,
      content: z.string().describe("Text content to write"),
      block: BlockSchema,
      scope: ScopeSchema,
      mode: ModeSchema,
      from: FromSchema,
      to: ToSchema,
    },
    async ({ path, content, block, scope, mode, from, to }) => {
      try {
        const client = new WebDAVClient(env);
        const target = resolveTarget({ block, scope, from, to });

        if (target.kind === "whole-file") {
          const { created } = await client.write(path, content);
          return ok(created ? `Created: ${path}` : `Updated: ${path}`);
        }

        const { content: existing } = await client.read(path);

        switch (target.kind) {
          case "markdown": {
            const updated = target.handler.write(
              existing,
              target.address,
              content,
              mode,
            );
            if (updated === undefined) {
              return err(
                new Error(`No heading named "${block}" found in ${path}.`),
              );
            }
            await client.write(path, updated);
            return ok(`Updated block "${block}" (${scope}/${mode}) in ${path}`);
          }
          case "raw": {
            const updated = target.handler.write(
              existing,
              target.address,
              content,
              mode,
            );
            if (updated === undefined) {
              return err(
                new Error(
                  `Line range ${from}-${to ?? from} is out of bounds in ${path}.`,
                ),
              );
            }
            await client.write(path, updated);
            return ok(
              `Updated lines ${from}-${to ?? from} (${mode}) in ${path}`,
            );
          }
        }
      } catch (e) {
        return err(e);
      }
    },
  );
}
