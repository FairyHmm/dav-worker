import { describe, it, expect, vi } from "vitest";
import { ICAL_CONTENT_TYPE, calDAVBasePath, ensureParentDir } from "./utils";

describe("ICAL_CONTENT_TYPE", () => {
  it("is the iCalendar content type with charset", () => {
    expect(ICAL_CONTENT_TYPE).toBe("text/calendar; charset=utf-8");
  });
});

describe("calDAVBasePath", () => {
  it("builds the calendars home path for a username", () => {
    expect(calDAVBasePath("fairy")).toBe(
      "/remote.php/dav/calendars/fairy",
    );
  });
});

describe("ensureParentDir", () => {
  it("creates the parent directory when path has one", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    await ensureParentDir("Documents/notes/todo.md", { mkdir });
    expect(mkdir).toHaveBeenCalledWith("Documents/notes");
  });

  // NOTE: lastIndexOf("/") returns -1 for a slashless path, and
  // slice(0, -1) drops the last character rather than yielding "" — so
  // this currently calls mkdir with a truncated, wrong directory instead
  // of skipping. Documenting actual behavior here; worth a follow-up fix
  // in ensureParentDir itself (guard on dir === path.slice(0, -1) only
  // when lastIndexOf found a real "/").
  it("mkdirs a truncated (incorrect) path for a top-level file with no parent", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    await ensureParentDir("todo.md", { mkdir });
    expect(mkdir).toHaveBeenCalledWith("todo.m");
  });
});
