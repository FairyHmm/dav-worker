export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function recordSection(
  value: unknown,
  section: string,
): Record<string, unknown> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`[${section}] must be a table.`);
  return value;
}

export function stringTable(
  value: unknown,
  section: string,
): Record<string, string> {
  const table = recordSection(value, section);
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(table)) {
    if (typeof entry !== "string")
      throw new Error(`[${section}] entry "${key}" must be a string.`);
    result[key] = entry;
  }
  return result;
}
