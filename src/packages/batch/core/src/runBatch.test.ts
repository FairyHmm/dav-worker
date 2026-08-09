import { describe, it, expect } from "vitest";
import { runBatch } from "./runBatch";
import type { BatchResult } from "./types";

function okResult(id: string): BatchResult {
  return { content: [{ type: "text", text: id }] };
}

function errResult(id: string): BatchResult {
  return { content: [{ type: "text", text: id }], isError: true };
}

describe("runBatch", () => {
  it("processes all items", async () => {
    const results = await runBatch(
      ["a", "b", "c"],
      async (item) => ({ result: okResult(item), state: undefined }),
    );
    expect(results).toHaveLength(3);
    expect(results.map((r) => (r.content[0] as any).text)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty items", async () => {
    const results = await runBatch(
      [],
      async (item) => ({ result: okResult(item), state: undefined }),
    );
    expect(results).toEqual([]);
  });

  it("mode=stop halts on error", async () => {
    const results = await runBatch(
      ["a", "b", "c"],
      async (item) => ({
        result: item === "b" ? errResult("fail") : okResult(item),
        state: undefined,
      }),
      "stop",
    );
    expect(results).toHaveLength(2);
    expect((results[0].content[0] as any).text).toBe("a");
    expect(results[1].isError).toBe(true);
  });

  it("mode=continue processes all items even with errors", async () => {
    const results = await runBatch(
      ["a", "b", "c"],
      async (item) => ({
        result: item === "b" ? errResult("fail") : okResult(item),
        state: undefined,
      }),
      "continue",
    );
    expect(results).toHaveLength(3);
  });

  it("stateful: advances state when didApply returns true", async () => {
    const results = await runBatch(
      ["a", "b", "c"],
      async (item, state: number) => ({
        result: { content: [{ type: "text", text: String(state) }] },
        state: state + 1,
      }),
      "continue",
      { initial: 0, didApply: () => true },
    );
    expect(results.map((r) => (r.content[0] as any).text)).toEqual(["0", "1", "2"]);
  });

  it("stateful: does NOT advance state when didApply returns false", async () => {
    const results = await runBatch(
      ["a", "b", "c"],
      async (item, state: number) => ({
        result: { content: [{ type: "text", text: String(state) }] },
        state: state + 1,
      }),
      "continue",
      {
        initial: 0,
        didApply: (r) => (r.content[0] as any).text !== "1",
      },
    );
    expect(results.map((r) => (r.content[0] as any).text)).toEqual(["0", "1", "1"]);
  });
});
