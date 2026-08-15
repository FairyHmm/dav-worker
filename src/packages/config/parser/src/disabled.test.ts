import { describe, it, expect } from "vitest";
import { parseDisabled } from "./disabled";

describe("parseDisabled", () => {
  it("returns zero-value for missing section", () => {
    expect(parseDisabled(undefined)).toEqual({ categories: [], tools: {} });
  });

  it("parses categories and per-category tool arrays", () => {
    const result = parseDisabled({
      categories: ["tasks"],
      files: ["entry_stat", "file_outline"],
      calendar: ["schedule_delete"],
    });
    expect(result).toEqual({
      categories: ["tasks"],
      tools: {
        files: ["entry_stat", "file_outline"],
        calendar: ["schedule_delete"],
      },
    });
  });

  it("defaults categories to [] when absent but tools present", () => {
    const result = parseDisabled({ files: ["entry_stat"] });
    expect(result.categories).toEqual([]);
    expect(result.tools.files).toEqual(["entry_stat"]);
  });

  it("throws when categories is not an array of strings", () => {
    expect(() => parseDisabled({ categories: "tasks" })).toThrow(
      "must be an array of strings",
    );
  });

  it("throws when a per-category value is not an array of strings", () => {
    expect(() => parseDisabled({ files: "entry_stat" })).toThrow(
      "must be an array of strings",
    );
  });

  it("throws on non-table disabled", () => {
    expect(() => parseDisabled("nope")).toThrow("[disabled] must be a table");
  });
});
