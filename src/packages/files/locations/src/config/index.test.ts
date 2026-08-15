import { describe, it, expect } from "vitest";
import { buildFilesConfig } from "./index";

describe("buildFilesConfig", () => {
  it("passes through aliases and patterns as-is", () => {
    const config = buildFilesConfig({
      aliases: { home: "/remote.php/dav/files/fairy" },
      patterns: { "Solo/*": "@home/Solo/*" },
    });
    expect(config.aliases.home).toBe("/remote.php/dav/files/fairy");
    expect(config.patterns["Solo/*"]).toBe("@home/Solo/*");
  });

  it("expands hosts into parent/name aliases", () => {
    const config = buildFilesConfig({
      hosts: { cloud: ["work", "personal"] },
    });
    expect(config.aliases.work).toBe("cloud/work");
    expect(config.aliases.personal).toBe("cloud/personal");
  });

  it("merges host-derived aliases with explicit aliases", () => {
    const config = buildFilesConfig({
      aliases: { home: "/dav/fairy" },
      hosts: { cloud: ["work"] },
    });
    expect(config.aliases.home).toBe("/dav/fairy");
    expect(config.aliases.work).toBe("cloud/work");
  });

  it("defaults to empty aliases and patterns", () => {
    const config = buildFilesConfig({});
    expect(config.aliases).toEqual({});
    expect(config.patterns).toEqual({});
  });
});
