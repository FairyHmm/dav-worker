// Shared by file_write's whole-file target (see SPEC-PARSER.md's "Mode ×
// target summary" for the full mode table across all targets). Reads the
// existing file (a missing file is treated as empty, so this also covers
// "append"/"prepend" to a file that doesn't exist yet), then combines it
// with `content` per `mode`, adding a `\n` separator only where the two
// pieces actually abut a non-empty existing file without one already.
// `mode: "replace"` isn't handled here — the caller writes `content`
// directly in that case, since there's no existing content to combine with.
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
    fileExists = false;
  }
  if (mode === "append") {
    const needsSeparator = existing.length > 0 && !existing.endsWith("\n");
    return { combined: existing + (needsSeparator ? "\n" : "") + content, fileExists };
  }
  const needsSeparator = existing.length > 0 && !content.endsWith("\n");
  return { combined: content + (needsSeparator ? "\n" : "") + existing, fileExists };
}
