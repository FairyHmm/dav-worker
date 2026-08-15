import { describe, it, expect } from "vitest";
import { writeSection } from "./write";
import { parse } from "@decimalturn/toml-patch";

describe("writeSection", () => {
  it("creates config.toml content from empty string", () => {
    const result = writeSection("", "preferences", { theme: "dark" });
    expect(parse(result)).toEqual({ preferences: { theme: "dark" } });
  });

  it("replaces a section wholesale, preserving others", () => {
    const existing = `
[preferences]
theme = "dark"

[calendars]
work = ["work", "#ff0000"]
`;
    const result = writeSection(existing, "calendars", {
      personal: ["personal", "#00ff00"],
    });
    const parsed = parse(result);
    expect(parsed.preferences.theme).toBe("dark");
    expect(parsed.calendars).toEqual({
      personal: ["personal", "#00ff00"],
    });
  });

  it("preserves comments/formatting elsewhere in the file", () => {
    const existing = `# top comment
[preferences]
theme = "dark" # inline comment
`;
    const result = writeSection(existing, "calendars", {
      work: ["work", "#fff"],
    });
    expect(result).toContain("# top comment");
    expect(result).toContain('theme = "dark" # inline comment');
  });

  it("throws on malformed base document", () => {
    expect(() => writeSection("[1,2,3]", "preferences", {})).toThrow();
  });
});
