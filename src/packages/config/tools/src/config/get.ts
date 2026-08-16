import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { parseAppConfig } from "@dav-worker/config-parser";
import { ok, err, defineTool } from "@dav-worker/mcp-utils";
import type { ConfigToolsDeps } from "../deps";
import { SectionSchema } from "../utils/schemas";
import { readConfigContent } from "../utils/read-content";
import { required, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    section: required(SectionSchema),
  };
}

type GetItem = Resolved<ReturnType<typeof createItemShape>, "section">;

export function registerConfigGetTool(
  server: McpServer,
  deps: ConfigToolsDeps,
  disabled: DisabledShape,
): void {
  defineTool(
    server,
    "config",
    disabled,
    "config_get",
    {
      description: "Return named section of config.",
      annotations: {
        title: "Get Session Section",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      ui: "config",
      itemShape: createItemShape(),
    },
    (item: GetItem) => getConfigSectionItem(deps, item),
  );
}

async function getConfigSectionItem(deps: ConfigToolsDeps, item: GetItem) {
  const { section } = item;
  try {
    const content = await readConfigContent(deps);
    const { raw } = parseAppConfig(content);
    return ok(JSON.stringify(raw[section], null, 2));
  } catch (e) {
    return err(e);
  }
}
