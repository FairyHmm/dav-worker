import { recordSection } from "./common";

// Per SPEC-TOOLS.md: `categories` is reserved (list of fully-disabled
// categories); every other key is a category name whose array lists
// individual tool names disabled within that category.
export interface DisabledShape {
  categories: string[];
  tools: Record<string, string[]>;
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`[${path}] must be an array of strings.`);
  }
  return [...value];
}

export function parseDisabled(value: unknown): DisabledShape {
  const table = recordSection(value, "disabled");
  const { categories, ...rest } = table;
  const tools: Record<string, string[]> = {};
  for (const [category, entry] of Object.entries(rest)) {
    tools[category] = stringArray(entry, `disabled.${category}`);
  }
  return {
    categories:
      categories === undefined ? [] : stringArray(categories, "disabled.categories"),
    tools,
  };
}
