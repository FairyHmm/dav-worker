import { createServer } from "node:http";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpServer, getCredential, getConfigPath } from "./src/server";

const PORT = Number(process.env.LOCAL_HTTP_PORT ?? 3747);

async function main(): Promise<void> {
  const credential = getCredential();
  const configPath = getConfigPath();

  const httpServer = createServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    const server = await createMcpServer(credential, configPath);
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`dav-worker local HTTP → http://localhost:${PORT}/mcp`);
  });
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
