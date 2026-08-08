import { z, type ZodType } from "zod";

// Scoped registry, not z.globalRegistry — can't collide with unrelated
// metadata another package attaches to the same schema instance.
type BatchFieldTags = {
  // required() differs from .optional(): that controls per-item omission,
  // this checks non-empty *after* top-level fill-in.
  required?: true;
  // locked() stops a batch from silently fanning writes across targets
  // (e.g. `list`) the caller never separately confirmed.
  locked?: true;
};

const batchFieldRegistry = z.registry<BatchFieldTags>();

function tag<T extends ZodType>(schema: T, patch: BatchFieldTags): T {
  const existing = batchFieldRegistry.get(schema) ?? {};
  batchFieldRegistry.add(schema, { ...existing, ...patch });
  return schema;
}

// Marks a field as required after batch resolution (see BatchFieldTags.required).
export function required<T extends ZodType>(schema: T): T {
  return tag(schema, { required: true });
}

// Marks a field as top-level-only in a batch (see BatchFieldTags.locked).
export function locked<T extends ZodType>(schema: T): T {
  return tag(schema, { locked: true });
}

// Base $ZodType, not full ZodType — generic Shape[keyof Shape] callers
// only have the narrower type, and lookup doesn't need more than that.
export function getBatchFieldTags(schema: z.core.$ZodType): BatchFieldTags {
  return batchFieldRegistry.get(schema as ZodType) ?? {};
}
