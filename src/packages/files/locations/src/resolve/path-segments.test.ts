import { describe, it, expect } from "vitest";
import { splitSegments, unescape, wildcardIndex } from "./path-segments";

describe("splitSegments", () => {
  it("splits on unescaped slashes", () => {
    expect(splitSegments("a/b/c")).toEqual(["a", "b", "c"]);
  });

  it("keeps escaped slashes within a segment", () => {
    expect(splitSegments("a\\/b/c")).toEqual(["a\\/b", "c"]);
  });

  it("returns single segment for no slashes", () => {
    expect(splitSegments("a")).toEqual(["a"]);
  });

  it("handles trailing slash as an empty final segment", () => {
    expect(splitSegments("a/")).toEqual(["a", ""]);
  });

  it("handles empty string as one empty segment", () => {
    expect(splitSegments("")).toEqual([""]);
  });
});

describe("unescape", () => {
  it("resolves escaped special characters to literals", () => {
    expect(unescape("a\\*b\\@c\\\\d\\/e")).toBe("a*b@c\\d/e");
  });

  it("passes through text with nothing escaped", () => {
    expect(unescape("plain")).toBe("plain");
  });
});

describe("wildcardIndex", () => {
  it("finds an unescaped wildcard", () => {
    expect(wildcardIndex("abc*def")).toBe(3);
  });

  it("skips an escaped wildcard", () => {
    expect(wildcardIndex("abc\\*def")).toBe(-1);
  });

  it("returns -1 when no wildcard present", () => {
    expect(wildcardIndex("abc")).toBe(-1);
  });

  it("finds the first of multiple wildcards", () => {
    expect(wildcardIndex("a*b*c")).toBe(1);
  });
});
