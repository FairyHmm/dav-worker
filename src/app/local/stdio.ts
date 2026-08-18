import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer, getCredential, getConfigPath } from "./src/server";

async function main(): Promise<void> {
  const credential = getCredential();
  const configPath = getConfigPath();
  const server = await createMcpServer(credential, configPath);
  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
