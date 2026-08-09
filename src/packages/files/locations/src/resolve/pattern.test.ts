import { describe, it, expect } from "vitest";
import { findMatchingPattern, applyPattern } from "./pattern";
import type { FilesConfig } from "../config/index";

describe("findMatchingPattern", () => {
  it("matches a literal pattern", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: { "Solo/Nadir": "@projects/Solo/Nadir" },
    };
    const match = findMatchingPattern(config, ["Solo", "Nadir"]);
    expect(match.replacement).toBe("@projects/Solo/Nadir");
    expect(match.capture).toBeUndefined();
  });

  it("matches a wildcard pattern and captures the value", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: { "Solo/*": "@projects/Solo/*" },
    };
    const match = findMatchingPattern(config, ["Solo", "PolyPalette"]);
    expect(match.replacement).toBe("@projects/Solo/*");
    expect(match.capture?.value).toBe("PolyPalette");
  });

  it("prefers a literal match over a wildcard match", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: {
        "Solo/*": "@projects/wildcard/*",
        "Solo/Nadir": "@projects/literal",
      },
    };
    const match = findMatchingPattern(config, ["Solo", "Nadir"]);
    expect(match.replacement).toBe("@projects/literal");
  });

  it("requires exact segment count", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: { "Solo/*": "@projects/Solo/*" },
    };
    expect(() =>
      findMatchingPattern(config, ["Solo", "Nadir", "extra"]),
    ).toThrow(/No matching location pattern/);
  });

  it("matches wildcard with prefix and suffix constraints", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: { "img-*-final": "@projects/*" },
    };
    const match = findMatchingPattern(config, ["img-hero-final"]);
    expect(match.capture?.value).toBe("hero");
  });

  it("rejects when input is too short for prefix+suffix", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: { "img-*-final": "@projects/*" },
    };
    expect(() => findMatchingPattern(config, ["img-final"])).toThrow();
  });

  it("throws when nothing matches", () => {
    const config: FilesConfig = { aliases: {}, patterns: {} };
    expect(() => findMatchingPattern(config, ["nope"])).toThrow(
      'No matching location pattern for: "nope"',
    );
  });

  it("last-defined wildcard wins among multiple wildcard matches", () => {
    const config: FilesConfig = {
      aliases: {},
      patterns: {
        "*-a": "@projects/first",
        "*-b": "@projects/second",
      },
    };
    // Only "*-b" can match "x-b" since segment literal parts differ.
    const match = findMatchingPattern(config, ["x-b"]);
    expect(match.replacement).toBe("@projects/second");
  });
});

describe("applyPattern", () => {
  it("fills the wildcard segment with the captured value", () => {
    const config: FilesConfig = { aliases: {}, patterns: {} };
    const result = applyPattern(config, {
      replacement: "@projects/Solo/*",
      capture: { value: "PolyPalette" },
    });
    expect(result).toBe("@projects/Solo/PolyPalette");
  });

  it("returns the template unchanged when there is no capture", () => {
    const config: FilesConfig = { aliases: {}, patterns: {} };
    const result = applyPattern(config, {
      replacement: "@projects/Solo/Nadir",
    });
    expect(result).toBe("@projects/Solo/Nadir");
  });

  // splitSegments("") yields [""], not [], so `first` is "" (not
  // undefined) — the undefined-guard never fires and this falls through
  // to the @projects-prefix branch with a trailing empty segment.
  it("returns @projects/ for an empty replacement template", () => {
    const config: FilesConfig = { aliases: {}, patterns: {} };
    const result = applyPattern(config, { replacement: "" });
    expect(result).toBe("@projects/");
  });

  it("keeps a template that already starts with an alias", () => {
    const config: FilesConfig = { aliases: {}, patterns: {} };
    const result = applyPattern(config, { replacement: "@home/Notes" });
    expect(result).toBe("@home/Notes");
  });

  it("prefixes with @ when the first segment is a known alias name", () => {
    const config: FilesConfig = {
      aliases: { work: "/remote.php/dav/files/fairy/work" },
      patterns: {},
    };
    const result = applyPattern(config, { replacement: "work/notes.md" });
    expect(result).toBe("@work/notes.md");
  });

  it("falls back to @projects when first segment is not a known alias", () => {
    const config: FilesConfig = { aliases: {}, patterns: {} };
    const result = applyPattern(config, { replacement: "Solo/Nadir" });
    expect(result).toBe("@projects/Solo/Nadir");
  });
});
