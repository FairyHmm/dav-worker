import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NextcloudBase } from "../clients/base.js";
import { ok, err } from "../utils.js";

export function registerHelloTool(server: McpServer, env: Env): void {
  server.tool(
    "nc_hello",
    "Ping the Nextcloud WebDAV root and confirm connectivity",
    {},
    async () => {
      try {
        const client = new NextcloudBase(env);
        const res = await client.request("OPTIONS", "/remote.php/dav/", {
          expectStatus: [200, 204, 207, 401, 405],
        });

        const status = res.status;
        const version = res.headers.get("x-nextcloud-version") ?? "unknown";

        return ok(`Nextcloud reachable — HTTP ${status}, version: ${version}`);
      } catch (e) {
        return err(e);
      }
    },
  );
}
