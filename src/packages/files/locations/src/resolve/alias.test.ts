import { describe, it, expect } from "vitest";
import { expandAliases } from "./alias";
import type { FilesConfig } from "../config/index";

const config: FilesConfig = {
  aliases: {
    home: "/remote.php/dav/files/fairy",
    projects: "@home/Documents/Fairy/Projects",
    self: "@self/loop",
  },
  patterns: {},
};

describe("expandAliases", () => {
  it("passes through literal paths unchanged", () => {
    expect(expandAliases(config, "Documents/notes.md")).toBe(
      "Documents/notes.md",
    );
  });

  it("expands a single-level alias", () => {
    expect(expandAliases(config, "@home")).toBe(
      "/remote.php/dav/files/fairy",
    );
  });

  it("expands an alias with a trailing path", () => {
    expect(expandAliases(config, "@home/todo.md")).toBe(
      "/remote.php/dav/files/fairy/todo.md",
    );
  });

  it("expands nested aliases recursively", () => {
    expect(expandAliases(config, "@projects/OSS")).toBe(
      "/remote.php/dav/files/fairy/Documents/Fairy/Projects/OSS",
    );
  });

  it("throws on unknown alias", () => {
    expect(() => expandAliases(config, "@nope")).toThrow(
      'Unknown alias: "@nope"',
    );
  });

  it("throws when alias expansion cycles", () => {
    expect(() => expandAliases(config, "@self")).toThrow(
      /exceeded depth cap/,
    );
  });
});
