import { describe, it, expect } from "vitest";
import { z } from "zod";
import { resolveItems } from "./resolveItems";
import { required, locked } from "./fieldTags";

describe("resolveItems", () => {
  it("falls back to defaults when items is undefined", () => {
    const shape = { name: z.string(), color: z.string() };
    const result = resolveItems(undefined, { name: "default", color: "red" }, shape);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([{ name: "default", color: "red" }]);
    }
  });

  it("falls back to defaults when items is empty", () => {
    const shape = { name: z.string() };
    const result = resolveItems([], { name: "fallback" }, shape);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([{ name: "fallback" }]);
    }
  });

  it("uses item overrides over defaults", () => {
    const shape = { name: z.string(), color: z.string() };
    const result = resolveItems(
      [{ color: "blue" }],
      { name: "default", color: "red" },
      shape,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([{ name: "default", color: "blue" }]);
    }
  });

  it("single item is NOT treated as a batch", () => {
    const shape = { target: locked(z.string()) };
    const result = resolveItems(
      [{ target: "file.txt" }],
      {},
      shape,
    );
    expect(result.ok).toBe(true);
  });

  it("batch rejects locked field set per-item", () => {
    const shape = { target: locked(z.string()) };
    const result = resolveItems(
      [{ target: "a.txt" } as any, { target: "b.txt" } as any],
      {},
      shape,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("can't be set per-item");
    }
  });

  it("batch allows locked field at top level", () => {
    const shape = { target: locked(z.string()) };
    const result = resolveItems(
      [{ color: "red" } as any, { color: "blue" } as any],
      { target: "shared.txt" },
      shape,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].target).toBe("shared.txt");
      expect(result.items[1].target).toBe("shared.txt");
    }
  });

  it("required field triggers error when missing", () => {
    const shape = { name: required(z.string()) };
    const result = resolveItems([{} as any], {}, shape);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("required");
    }
  });

  it("required field triggers error on empty string", () => {
    const shape = { name: required(z.string()) };
    const result = resolveItems([{ name: "" }], {}, shape);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("required");
    }
  });

  it("required field in batch includes item number", () => {
    const shape = { name: required(z.string()) };
    const result = resolveItems([{ name: "ok" }, {} as any], {}, shape);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("item 2");
    }
  });

  it("required locked field omits item number", () => {
    const shape = { name: required(locked(z.string())) };
    // locked field set per-item hits locked check first (different error message);
    // to hit required check, set it at top level as empty string
    const result = resolveItems([{} as any, {} as any], { name: "" }, shape);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("required");
      expect(result.error).not.toContain("item");
    }
  });

  it("multiple items batch resolves all", () => {
    const shape = { tag: z.string(), count: z.number() };
    const result = resolveItems(
      [{ tag: "a" }, { tag: "b" }],
      { count: 1 },
      shape,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toEqual([
        { tag: "a", count: 1 },
        { tag: "b", count: 1 },
      ]);
    }
  });
});
