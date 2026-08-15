import { describe, it, expect } from "vitest";
import { resolve } from "./resolve";
import type { DisabledShape } from "./disabled";

describe("resolve", () => {
  const empty: DisabledShape = { categories: [], tools: {} };

  it("enables tools with no disabled config", () => {
    expect(resolve("files", "entry_stat", empty)).toBe("ENABLED");
  });

  it("category veto disables every tool in that category", () => {
    const disabled: DisabledShape = { categories: ["tasks"], tools: {} };
    expect(resolve("tasks", "task_create", disabled)).toBe("DISABLED");
    expect(resolve("tasks", "anything", disabled)).toBe("DISABLED");
  });

  it("category veto cannot be punched through by a per-tool entry", () => {
    const disabled: DisabledShape = {
      categories: ["tasks"],
      tools: { tasks: [] }, // even an empty override list doesn't re-enable
    };
    expect(resolve("tasks", "task_create", disabled)).toBe("DISABLED");
  });

  it("per-tool disable subtracts from an enabled category", () => {
    const disabled: DisabledShape = {
      categories: [],
      tools: { files: ["entry_stat"] },
    };
    expect(resolve("files", "entry_stat", disabled)).toBe("DISABLED");
    expect(resolve("files", "file_outline", disabled)).toBe("ENABLED");
  });

  it("per-tool disable has no effect when category is vetoed", () => {
    const disabled: DisabledShape = {
      categories: ["files"],
      tools: { files: ["entry_stat"] },
    };
    // entry_stat is disabled either way, but via the category veto path
    expect(resolve("files", "entry_stat", disabled)).toBe("DISABLED");
    // file_outline isn't individually listed but category veto still applies
    expect(resolve("files", "file_outline", disabled)).toBe("DISABLED");
  });

  it("persistence: per-tool list stays inert while category disabled, resumes when re-enabled", () => {
    const stillDisabled: DisabledShape = {
      categories: ["files"],
      tools: { files: ["entry_stat"] },
    };
    expect(resolve("files", "file_outline", stillDisabled)).toBe("DISABLED");

    const reEnabled: DisabledShape = {
      categories: [], // category removed from the veto list
      tools: { files: ["entry_stat"] }, // per-tool list untouched
    };
    expect(resolve("files", "entry_stat", reEnabled)).toBe("DISABLED");
    expect(resolve("files", "file_outline", reEnabled)).toBe("ENABLED");
  });

  it("unrelated categories are unaffected by another category's config", () => {
    const disabled: DisabledShape = {
      categories: ["tasks"],
      tools: { files: ["entry_stat"] },
    };
    expect(resolve("calendar", "schedule_list", disabled)).toBe("ENABLED");
  });
});
