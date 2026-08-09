import { describe, it, expect } from "vitest";
import { calendarPath, calendarDavUrl } from "./url";

describe("calendarPath", () => {
  it("joins base path and calendar name with trailing slash", () => {
    expect(calendarPath("/remote.php/dav/calendars/fairy", "work")).toBe(
      "/remote.php/dav/calendars/fairy/work/",
    );
  });
});

describe("calendarDavUrl", () => {
  it("joins host, base path, and calendar name with trailing slash", () => {
    expect(
      calendarDavUrl(
        "https://cloud.example",
        "/remote.php/dav/calendars/fairy",
        "work",
      ),
    ).toBe("https://cloud.example/remote.php/dav/calendars/fairy/work/");
  });
});
