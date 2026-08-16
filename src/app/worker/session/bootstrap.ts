import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { assembleServer, loadConfig } from "@dav-worker/server-core";
import { createNextcloudWebDAVStorage } from "@dav-worker/storage-nextcloud";
import type { SessionProps } from "./types";

export async function createServer(props: SessionProps): Promise<McpServer> {
  // Ajv (SDK default) uses `new Function` at runtime, which workerd disallows.
  const server = new McpServer(
    { name: "dav-worker", version: "0.1.0" },
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );

  const fileStorage = createNextcloudWebDAVStorage(props.credential);
  const configContent = await loadConfig(props.configs.path, fileStorage);

  await assembleServer(
    server,
    props.credential,
    configContent,
    props.configs.path,
  );
  return server;
}
