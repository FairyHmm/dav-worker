import type { DisabledShape } from "./disabled";

// Pure resolution per SPEC-TOOLS.md: category veto is absolute; per-tool
// disable is a subtraction that only applies when the category itself
// is enabled. Agnostic of what tools exist — callers gate their own
// registerXTool(...) calls with this.
export function resolve(
  category: string,
  name: string,
  disabled: DisabledShape,
): "ENABLED" | "DISABLED" {
  if (disabled.categories.includes(category)) return "DISABLED";
  if (disabled.tools[category]?.includes(name)) return "DISABLED";
  return "ENABLED";
}
