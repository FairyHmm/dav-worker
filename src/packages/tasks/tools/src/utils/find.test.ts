import { describe, it, expect, vi } from "vitest";
import { findTaskAcrossLists } from "./find";
import { WebDAVHttpError } from "@dav-worker/clients-webdav";
import type { TaskStorage, TaskEntry } from "@dav-worker/task-contracts";

function makeStorage(
  listAll: TaskStorage["listAll"],
  findByUid: TaskStorage["findByUid"],
): TaskStorage {
  return { listAll, findByUid } as TaskStorage;
}

const entry: TaskEntry = { uid: "uid-1", ics: "BEGIN:VCALENDAR" };
const lists = [
  { slug: "personal", displayName: "Personal", color: null },
  { slug: "work", displayName: "Work", color: null },
];

describe("findTaskAcrossLists", () => {
  it("returns the first list with a match", async () => {
    const listAll = vi.fn().mockResolvedValue(lists);
    const findByUid = vi
      .fn()
      .mockImplementation(async (slug: string) =>
        slug === "work" ? entry : null,
      );
    const result = await findTaskAcrossLists(
      makeStorage(listAll, findByUid),
      "uid-1",
    );
    expect(result.found).toEqual({ list: "work", entry });
    expect(result.warnings).toEqual([]);
  });

  it("returns null found and no warnings when nothing matches", async () => {
    const listAll = vi.fn().mockResolvedValue(lists);
    const findByUid = vi.fn().mockResolvedValue(null);
    const result = await findTaskAcrossLists(
      makeStorage(listAll, findByUid),
      "uid-1",
    );
    expect(result.found).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("collects a warning for a 404'd list and keeps searching", async () => {
    const listAll = vi.fn().mockResolvedValue(lists);
    const findByUid = vi.fn().mockImplementation(async (slug: string) => {
      if (slug === "personal") {
        throw new WebDAVHttpError("REPORT", "/personal", 404);
      }
      return entry;
    });
    const result = await findTaskAcrossLists(
      makeStorage(listAll, findByUid),
      "uid-1",
    );
    expect(result.found).toEqual({ list: "work", entry });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Task list "personal"');
  });

  it("rethrows a non-404 error immediately", async () => {
    const listAll = vi.fn().mockResolvedValue(lists);
    const findByUid = vi
      .fn()
      .mockRejectedValue(new WebDAVHttpError("REPORT", "/personal", 500));
    await expect(
      findTaskAcrossLists(makeStorage(listAll, findByUid), "uid-1"),
    ).rejects.toBeInstanceOf(WebDAVHttpError);
  });
});
