export async function combineWholeFile(
  client: { read(p: string): Promise<{ content: string }> },
  path: string,
  content: string,
  mode: "append" | "prepend",
): Promise<{ combined: string; fileExists: boolean }> {
  let existing = "";
  let fileExists = true;
  try {
    existing = (await client.read(path)).content;
  } catch {
    // Missing file treated as empty — covers append/prepend to a file
    // that doesn't exist yet.
    fileExists = false;
  }
  if (mode === "append") {
    const needsSeparator = existing.length > 0 && !existing.endsWith("\n");
    return { combined: existing + (needsSeparator ? "\n" : "") + content, fileExists };
  }
  const needsSeparator = existing.length > 0 && !content.endsWith("\n");
  return { combined: content + (needsSeparator ? "\n" : "") + existing, fileExists };
}
