import { describe, it, expect } from "vitest";
import {
  escapeText,
  unescapeText,
  splitTextList,
  joinTextList,
} from "./escape";

describe("escapeText / unescapeText", () => {
  it("round-trips simple text", () => {
    const text = "Hello World";
    expect(unescapeText(escapeText(text))).toBe(text);
  });

  it("round-trips text with semicolons", () => {
    const text = "A;B;C";
    expect(unescapeText(escapeText(text))).toBe(text);
  });

  it("round-trips text with commas", () => {
    const text = "A,B,C";
    expect(unescapeText(escapeText(text))).toBe(text);
  });

  it("round-trips text with backslashes", () => {
    const text = "Path\\to\\file";
    expect(unescapeText(escapeText(text))).toBe(text);
  });

  it("round-trips text with newlines", () => {
    const text = "Line 1\nLine 2";
    expect(unescapeText(escapeText(text))).toBe(text);
  });

  it("does NOT escape colons (RFC 5545)", () => {
    expect(escapeText("http://example.com")).toBe("http://example.com");
  });

  it("handles trailing backslash", () => {
    expect(escapeText("test\\")).toBe("test\\\\");
    expect(unescapeText("test\\\\")).toBe("test\\");
  });
});

describe("splitTextList / joinTextList", () => {
  it("splits comma-separated values", () => {
    expect(splitTextList("A,B,C")).toEqual(["A", "B", "C"]);
  });

  it("handles escaped commas inside values", () => {
    expect(splitTextList("Home\\, Improvements,Work")).toEqual([
      "Home, Improvements",
      "Work",
    ]);
  });

  it("round-trips through joinTextList", () => {
    const items = ["Tag 1", "Tag 2", "Home, Improvements"];
    expect(splitTextList(joinTextList(items))).toEqual(items);
  });

  it("handles empty list", () => {
    expect(splitTextList("")).toEqual([""]);
  });

  it("handles single item", () => {
    expect(splitTextList("Solo")).toEqual(["Solo"]);
  });
});
