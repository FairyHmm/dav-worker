import { describe, it, expect } from "vitest";
import { parseAppConfig } from "./config";

describe("parseAppConfig", () => {
  it("parses empty string to zero-value raw config", () => {
    const config = parseAppConfig("");
    expect(config.raw.preferences).toEqual({});
    expect(config.raw.locations).toEqual({
      aliases: {},
      hosts: {},
      patterns: {},
    });
    expect(config.raw.calendars).toEqual({});
    expect(config.raw.disabled).toEqual({ categories: [], tools: {} });
  });

  it("extracts a valid full config into raw sections", () => {
    const toml = `
[preferences]
theme = "dark"

[locations.aliases]
home = "/remote.php/dav/files/user"

[locations.hosts]
cloud = ["https://cloud.example"]

[locations.patterns]
docs = "Documents/.*"

[calendars]
work = ["work", "#ff0000"]

[disabled]
categories = ["tasks"]
files = ["entry_stat"]
`;
    const config = parseAppConfig(toml);
    expect(config.raw.preferences.theme).toBe("dark");
    expect(config.raw.locations.aliases.home).toBe(
      "/remote.php/dav/files/user",
    );
    expect(config.raw.locations.hosts.cloud).toEqual(["https://cloud.example"]);
    expect(config.raw.locations.patterns.docs).toBe("Documents/.*");
    expect(config.raw.calendars.work).toEqual(["work", "#ff0000"]);
    expect(config.raw.disabled).toEqual({
      categories: ["tasks"],
      tools: { files: ["entry_stat"] },
    });
  });

  it("throws on invalid TOML", () => {
    expect(() => parseAppConfig("[1, 2, 3]")).toThrow();
  });

  it("throws on non-table locations", () => {
    const toml = `locations = "not a table"`;
    expect(() => parseAppConfig(toml)).toThrow("[locations] must be a table");
  });

  it("throws on invalid hosts entry", () => {
    const toml = `
[locations]
hosts = { cloud = "not-array" }
`;
    expect(() => parseAppConfig(toml)).toThrow("must be an array of strings");
  });

  it("throws on invalid calendar entry", () => {
    const toml = `
[calendars]
work = "not-an-array"
`;
    expect(() => parseAppConfig(toml)).toThrow("[slug, color] pair");
  });
});
