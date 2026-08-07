// Server-reported Content-Type is unreliable for some extensions (.ts → video/mp2t).
import languages from "./languages.json" with { type: "json" };

export type LanguageType = "programming" | "markup" | "prose" | "data" | "binary";

export interface LanguageHint {
  type: LanguageType;
  contentType: string;
  extensions: string[];
}

// Flat extension → hint lookup, built once at module load.
const byExtension: Record<string, LanguageHint> = {};
for (const hint of Object.values(languages) as LanguageHint[]) {
  for (const ext of hint.extensions) {
    byExtension[ext.toLowerCase()] = hint;
  }
}

export function resolveFromExtension(filePath: string): LanguageHint | null {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return null;
  return byExtension[filePath.slice(dot).toLowerCase()] ?? null;
}

// Single entry point for the read path: tells the caller whether the file
// can be read as text and, if so, which content-type to report. Extension
// hint wins when known; server-reported Content-Type is the fallback only
// for unrecognized extensions.
export interface ReadableCheck {
  readable: boolean;
  contentType: string;
}

export function checkReadable(filePath: string, serverContentType: string | null): ReadableCheck {
  const hint = resolveFromExtension(filePath);
  if (hint !== null) {
    return { readable: hint.type !== "binary", contentType: hint.contentType };
  }
  const contentType = serverContentType ?? "application/octet-stream";
  const readable = contentType.startsWith("text/") || contentType === "application/json";
  return { readable, contentType };
}
