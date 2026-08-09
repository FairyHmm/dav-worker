import { describe, it, expect } from "vitest";
import { resolveLocation } from "./index";
import type { FilesConfig } from "../config/index";

describe("resolveLocation", () => {
  const config: FilesConfig = {
    aliases: { home: "/remote.php/dav/files/fairy" },
    patterns: { "Solo/*": "@home/Documents/Fairy/Projects/Solo/*" },
  };

  it("resolves via a matching pattern then expands the alias", () => {
    expect(resolveLocation(config, "Solo/Nadir")).toBe(
      "/remote.php/dav/files/fairy/Documents/Fairy/Projects/Solo/Nadir",
    );
  });

  it("falls back to a bare known alias when no pattern matches", () => {
    expect(resolveLocation(config, "home/todo.md")).toBe(
      "/remote.php/dav/files/fairy/todo.md",
    );
  });

  it("throws when neither a pattern nor a bare alias matches", () => {
    expect(() => resolveLocation(config, "nowhere/at/all")).toThrow(
      /No matching location pattern/,
    );
  });
});
