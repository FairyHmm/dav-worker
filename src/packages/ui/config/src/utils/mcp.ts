import { callTool } from "@dav-worker/ui-shared";

export interface ToolEntry {
  name: string;
  category: string;
}

export async function getSection(section: string): Promise<unknown> {
  const raw = await callTool("config_get", { section });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function setSection(
  section: string,
  value: Record<string, unknown>,
): Promise<void> {
  await callTool("config_set", { section, value });
}

export async function listTools(): Promise<ToolEntry[]> {
  // Injected at resource-serve time by registerResources as window.__mcp_tools__.
  // In dev the bridge doesn't inject this, so fall back to empty.
  const injected = (window as unknown as Record<string, unknown>).__mcp_tools__;
  return Array.isArray(injected) ? (injected as ToolEntry[]) : [];
}
