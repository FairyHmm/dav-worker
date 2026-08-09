import { describe, it, expect } from "vitest";
import { text, ok, err, formatWarnings, jsonResponse } from "./index";

describe("text", () => {
  it("returns MCP text content block", () => {
    expect(text("hello")).toEqual({ type: "text", text: "hello" });
  });

  it("type is literal 'text'", () => {
    const block = text("x");
    expect(block.type).toBe("text");
  });
});

describe("ok", () => {
  it("wraps text in content array", () => {
    expect(ok("done")).toEqual({ content: [{ type: "text", text: "done" }] });
  });

  it("is not an error", () => {
    expect(ok("done")).not.toHaveProperty("isError");
  });
});

describe("err", () => {
  it("formats Error objects", () => {
    const result = err(new Error("bad input"));
    expect(result.content[0].text).toBe("Error: bad input");
    expect(result.isError).toBe(true);
  });

  it("formats plain strings", () => {
    expect(err("oops").content[0].text).toBe("Error: oops");
  });

  it("formats numbers", () => {
    expect(err(42).content[0].text).toBe("Error: 42");
  });

  it("formats null", () => {
    expect(err(null).content[0].text).toBe("Error: null");
  });

  it("formats undefined", () => {
    expect(err(undefined).content[0].text).toBe("Error: undefined");
  });

  it("formats booleans", () => {
    expect(err(false).content[0].text).toBe("Error: false");
  });
});

describe("formatWarnings", () => {
  it("returns empty string for empty array", () => {
    expect(formatWarnings([])).toBe("");
  });

  it("joins warnings with prefix", () => {
    expect(formatWarnings(["a", "b"])).toBe("⚠️ a b\n\n");
  });

  it("single warning", () => {
    expect(formatWarnings(["x"])).toBe("⚠️ x\n\n");
  });
});

describe("jsonResponse", () => {
  it("returns JSON response with default 200", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns JSON response with custom status", async () => {
    const res = jsonResponse({ error: "not found" }, 404);
    expect(res.status).toBe(404);
  });
});
