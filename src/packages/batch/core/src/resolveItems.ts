import type { z, ZodRawShape } from "zod";
import { getBatchFieldTags } from "./fieldTags.js";

export type ResolveItemsResult<T> =
  { ok: true; items: T[] } | { ok: false; error: string };

// required() tags live in a runtime registry, invisible to the type
// system — RequiredKeys lets a tool spell the narrowing explicitly
// instead, matching what resolveItems actually guarantees at runtime.
export type Resolved<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>>,
> = Omit<z.infer<z.ZodObject<Shape>>, RequiredKeys> &
  Required<Pick<z.infer<z.ZodObject<Shape>>, RequiredKeys>>;

// Takes the tool's real itemShape, not a derived key list, so it can read
// required()/locked() tags itself instead of per-tool hand-written checks.
// Returns a result object, not a throw — callers want to `err()` it.
export function resolveItems<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
>(
  items: Partial<z.infer<z.ZodObject<Shape>>>[] | undefined,
  defaults: Record<string, unknown>,
  itemShape: Shape,
): ResolveItemsResult<Resolved<Shape, RequiredKeys>> {
  type Item = z.infer<z.ZodObject<Shape>>;
  const keys = Object.keys(itemShape) as (keyof Shape & string)[];
  const isBatch = !!items && items.length > 1;
  const source: Partial<Item>[] =
    items && items.length > 0 ? items : [defaults as Partial<Item>];

  const resolved: Item[] = [];

  for (let i = 0; i < source.length; i++) {
    const raw = source[i] as Record<string, unknown>;
    const out: Record<string, unknown> = { ...raw };

    for (const key of keys) {
      const tags = getBatchFieldTags(itemShape[key]);

      if (tags.locked && isBatch && raw[key] !== undefined) {
        return {
          ok: false,
          error:
            `Field "${key}" can't be set per-item in a batch — it's shared ` +
            `across all items. Set it at the top level instead, or run ` +
            `separate calls if items genuinely need different values.`,
        };
      }

      if (out[key] === undefined && defaults[key] !== undefined) {
        out[key] = defaults[key];
      }

      if (tags.required && (out[key] === undefined || out[key] === "")) {
        // locked() fields are shared by definition, so every item is
        // missing them together — attributing the failure to item N
        // would blame one item for what's actually a batch-wide gap.
        const where = isBatch && !tags.locked ? ` (item ${i + 1})` : "";
        return { ok: false, error: `Field "${key}" is required${where}.` };
      }
    }

    resolved.push(out as Item);
  }

  // Runtime enforced required()/locked() above; this cast applies the
  // narrowing RequiredKeys asked for.
  return { ok: true, items: resolved as Resolved<Shape, RequiredKeys>[] };
}
