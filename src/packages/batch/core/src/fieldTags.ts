import { z, type ZodType } from "zod";

// Declarative per-field batch behavior, attached at the point a tool
// declares its itemShape (next to .describe()) instead of a side-channel
// options bag passed to resolveItems/withBatchSupport. Uses a batch-core-
// scoped registry, not z.globalRegistry, so this can't collide with
// unrelated metadata some other package might attach to the same schema
// instance later.
type BatchFieldTags = {
  // Field must be non-empty (present, not undefined) *after* resolution
  // fills it in from top-level defaults — distinct from .optional(),
  // which only controls whether a single item may omit the field and
  // inherit it. A field can be .optional() at the Zod level (so items
  // can individually skip it) and still be required(): resolveItems
  // rejects the item if, after fill-in, it's still missing.
  required?: true;
  // Field may be set at the top level (as a default for every item) but
  // not overridden per-item. For fields like `list`, where the value
  // determines *where data physically goes*, this closes the footgun of
  // a batch silently fanning out writes across targets the caller never
  // separately confirmed. resolveItems rejects any item that sets its
  // own value for a locked() field when items.length > 1.
  locked?: true;
};

const batchFieldRegistry = z.registry<BatchFieldTags>();

function tag<T extends ZodType>(schema: T, patch: BatchFieldTags): T {
  const existing = batchFieldRegistry.get(schema) ?? {};
  batchFieldRegistry.add(schema, { ...existing, ...patch });
  return schema;
}

/** Marks a field as required after batch resolution (see BatchFieldTags.required). */
export function required<T extends ZodType>(schema: T): T {
  return tag(schema, { required: true });
}

/** Marks a field as top-level-only in a batch (see BatchFieldTags.locked). */
export function locked<T extends ZodType>(schema: T): T {
  return tag(schema, { locked: true });
}

// Accepts the base $ZodType, not the full ZodType — callers holding a
// value typed as `Shape[keyof Shape]` from a generic `Shape extends
// ZodRawShape` only have the narrower internal type at that point, even
// though the runtime object is a full ZodType. Reading tags doesn't need
// the full API surface, just registry lookup, so widen the parameter
// instead of forcing every call site to re-assert the concrete type.
export function getBatchFieldTags(schema: z.core.$ZodType): BatchFieldTags {
  return batchFieldRegistry.get(schema as ZodType) ?? {};
}
