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
  const raw = await callTool("tools_list", {});
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? (parsed as ToolEntry[]) : [];
}
