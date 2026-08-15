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

  it("skips mkdir for a top-level file with no parent", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    await ensureParentDir("todo.md", { mkdir });
    expect(mkdir).not.toHaveBeenCalled();
  });
});
