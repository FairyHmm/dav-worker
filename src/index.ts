import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFilesTools } from "./tools/files/index.js";

function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "dav-worker",
    version: "0.1.0",
  });

  registerFilesTools(server, env);

  return server;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const server = createServer(env);
    return createMcpHandler(server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
