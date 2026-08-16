import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Credential } from "./types";
import { createStorages } from "./storage";
import { registerTools } from "./tools";
import { registerResources } from "./resources";

export async function assembleServer(
  server: McpServer,
  credential: Credential,
  configContent: string,
  configPath: string | undefined,
): Promise<void> {
  const storages = createStorages(credential);
  await registerTools(server, storages, configContent, configPath);
  registerResources(server);
}
