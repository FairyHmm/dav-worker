import { callTool } from "@dav-worker/ui-shared";

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
