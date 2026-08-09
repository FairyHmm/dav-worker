import { describe, it, expect } from "vitest";
import { WebDAVHttpError } from "./transport";

describe("WebDAVHttpError", () => {
  it("formats message with method, path, and status", () => {
    const err = new WebDAVHttpError("GET", "/files/user", 404);
    expect(err.message).toBe("WebDAV GET /files/user → 404");
    expect(err.status).toBe(404);
    expect(err.name).toBe("WebDAVHttpError");
  });

  it("is an instance of Error", () => {
    expect(new WebDAVHttpError("PUT", "/x", 500)).toBeInstanceOf(Error);
  });
});
