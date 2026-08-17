import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { writeSection } from "@dav-worker/config-parser";
import { ok, err, defineTool, type ToolEntry } from "@dav-worker/mcp-utils";
import type { ConfigToolsDeps } from "../deps";
import { SectionSchema, ValueSchema } from "../utils/schemas";
import { readConfigContent } from "../utils/read-content";
import { required, type Resolved } from "@dav-worker/batch-core";
import type { DisabledShape } from "@dav-worker/config-parser";

function createItemShape() {
  return {
    section: required(SectionSchema),
    value: required(ValueSchema),
  };
}

type SetItem = Resolved<
  ReturnType<typeof createItemShape>,
  "section" | "value"
>;

export function registerConfigSetTool(
  server: McpServer,
  deps: ConfigToolsDeps,
  disabled: DisabledShape,
  collector?: ToolEntry[],
): void {
  defineTool(
    server,
    "config",
    disabled,
    "config_set",
    {
      description:
        "Replace one named section of config. Creates the file on first write.",
      annotations: {
        title: "Set Config Section",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      ui: "config",
      itemShape: createItemShape(),
    },
    (item: SetItem, state: { content: string | undefined }) =>
      setConfigSectionItem(deps, item, state),
    {
      // Threaded content string so a batch of section writes accumulates
      // against each other's result instead of each starting fresh
      initial: { content: undefined },
      didApply: (result: { isError?: boolean } | { content: unknown[] }) =>
        !("isError" in result && result.isError),
    },
    collector,
  );
}

async function setConfigSectionItem(
  deps: ConfigToolsDeps,
  item: SetItem,
  state: { content: string | undefined },
) {
  const { section, value } = item;
  try {
    const existing = state.content ?? (await readConfigContent(deps));
    const updated = writeSection(existing, section, value);
    await deps.storage.write(deps.path, updated);
    return {
      result: ok(JSON.stringify({ section, value }, null, 2)),
      state: { content: updated },
    };
  } catch (e) {
    return { result: err(e), state };
  }
}
