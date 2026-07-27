// Shared by file_write's whole-file target (see SPEC-PARSER.md's "Mode ×
// target summary" for the full mode table across all targets). Reads the
// existing file (a missing file is treated as empty, so this also covers
// "append" to a file that doesn't exist yet), then appends `content`,
// adding a `\n` separator only if the existing content is non-empty and
// doesn't already end in one.
export async function appendWholeFile(
  client: { read(p: string): Promise<{ content: string }> },
  path: string,
  content: string,
): Promise<{ combined: string; fileExists: boolean }> {
  let existing = "";
  let fileExists = true;
  try {
    existing = (await client.read(path)).content;
  } catch {
    fileExists = false;
  }
  const needsSeparator = existing.length > 0 && !existing.endsWith("\n");
  return { combined: existing + (needsSeparator ? "\n" : "") + content, fileExists };
}
