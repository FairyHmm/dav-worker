import { describe, it, expect } from "vitest";
import { davPath, davUrl } from "./url";

describe("davPath", () => {
  it("strips leading slashes from path", () => {
    expect(davPath("/base", "/remote.php/dav")).toBe("/base/remote.php/dav");
  });

  it("encodes spaces per segment", () => {
    expect(davPath("/base", "a/b c")).toBe("/base/a/b%20c");
  });

  it("handles empty path", () => {
    expect(davPath("/base", "")).toBe("/base/");
  });

  it("handles path with special chars", () => {
    expect(davPath("/base", "file?name=hello#1")).toBe(
      "/base/file%3Fname%3Dhello%231",
    );
  });
});

describe("davUrl", () => {
  it("concatenates host and davPath", () => {
    expect(
      davUrl("https://cloud.example", "/remote.php/dav", "files/user"),
    ).toBe("https://cloud.example/remote.php/dav/files/user");
  });
});
