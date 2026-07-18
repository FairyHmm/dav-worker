import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebDAVClient } from "../../clients/webdav.js";
import { ok, err } from "../../utils.js";
import { BlockSchema, FromSchema, PathSchema, ToSchema } from "./schemas.js";
import { resolveTarget } from "../../parser/resolve-target.js";

export function registerReadTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_files_read",
    "Read a text file from the Nextcloud vault. Returns an error for binary files. " +
      "Pass `block` with a heading title to read only that heading's section " +
      "(including its nested subheadings), or `from`/`to` for a 1-indexed line " +
      "range, instead of the whole file.",
    { path: PathSchema, block: BlockSchema, from: FromSchema, to: ToSchema },
    async ({ path, block, from, to }) => {
      try {
        const client = new WebDAVClient(env);
        const { content } = await client.read(path);

        const target = resolveTarget({ block, from, to });

        switch (target.kind) {
          case "whole-file":
            return ok(content);
          case "markdown": {
            const result = target.handler.read(content, target.address);
            if (result === undefined) {
              return err(
                new Error(`No heading named "${block}" found in ${path}.`),
              );
            }
            return ok(result);
          }
          case "raw": {
            const result = target.handler.read(content, target.address);
            if (result === undefined) {
              return err(
                new Error(
                  `Line range ${from}-${to ?? from} is out of bounds in ${path}.`,
                ),
              );
            }
            return ok(result);
          }
        }
      } catch (e) {
        return err(e);
      }
    },
  );
}
