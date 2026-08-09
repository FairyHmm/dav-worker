import { describe, it, expect } from "vitest";
import {
  parseResponses,
  isCollection,
  mergedProps,
  propOrNull,
  decodeMissedNumericEntities,
} from "./xml";

describe("parseResponses", () => {
  it("parses single response", () => {
    const xml = `<?xml version="1.0"?>
<multistatus>
  <response>
    <href>/remote.php/dav/files/user/</href>
    <propstat><prop><displayname>User</displayname></prop></propstat>
  </response>
</multistatus>`;
    const results = parseResponses(xml);
    expect(results).toHaveLength(1);
    expect(results[0].href).toBe("/remote.php/dav/files/user/");
  });

  it("parses multiple responses", () => {
    const xml = `<?xml version="1.0"?>
<multistatus>
  <response>
    <href>/a</href>
    <propstat><prop><displayname>A</displayname></prop></propstat>
  </response>
  <response>
    <href>/b</href>
    <propstat><prop><displayname>B</displayname></prop></propstat>
  </response>
</multistatus>`;
    const results = parseResponses(xml);
    expect(results).toHaveLength(2);
    expect(results[0].href).toBe("/a");
    expect(results[1].href).toBe("/b");
  });

  it("returns empty array for empty/malformed XML", () => {
    expect(parseResponses("<empty/>")).toEqual([]);
  });
});

describe("isCollection", () => {
  it("returns true for collection resource", () => {
    expect(isCollection({ resourcetype: { collection: "" } })).toBe(true);
  });

  it("returns false for non-collection", () => {
    expect(isCollection({ resourcetype: {} })).toBe(false);
  });

  it("returns false for missing resourcetype", () => {
    expect(isCollection({})).toBe(false);
    expect(isCollection(null)).toBe(false);
    expect(isCollection(undefined)).toBe(false);
  });
});

describe("mergedProps", () => {
  it("merges single propstat", () => {
    const r = { propstat: { prop: { displayname: "test" } } };
    expect(mergedProps(r)).toEqual({ displayname: "test" });
  });

  it("merges multiple propstats", () => {
    const r = {
      propstat: [
        { prop: { displayname: "test" } },
        { prop: { getcontentlength: "123" } },
      ],
    };
    expect(mergedProps(r)).toEqual({
      displayname: "test",
      getcontentlength: "123",
    });
  });

  it("returns empty object for missing propstat", () => {
    expect(mergedProps({})).toEqual({});
  });
});

describe("propOrNull", () => {
  it("returns null for empty string", () => {
    expect(propOrNull("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(propOrNull(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(propOrNull(undefined)).toBeNull();
  });

  it("returns string for zero", () => {
    expect(propOrNull(0)).toBe("0");
  });

  it("returns string for non-empty string", () => {
    expect(propOrNull("hello")).toBe("hello");
  });
});

describe("decodeMissedNumericEntities", () => {
  it("decodes decimal entities", () => {
    expect(decodeMissedNumericEntities("a&#13;b&#10;c")).toBe("a\rb\nc");
  });

  it("decodes hex entities", () => {
    expect(decodeMissedNumericEntities("&#x41;")).toBe("A");
  });

  it("passes through text without entities", () => {
    expect(decodeMissedNumericEntities("plain text")).toBe("plain text");
  });
});
