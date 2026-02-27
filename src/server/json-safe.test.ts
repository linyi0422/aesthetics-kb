import { describe, expect, it } from "vitest";
import { parseJsonStringArray } from "./json-safe";

describe("json safe parser", () => {
  it("parses a valid string array", () => {
    expect(parseJsonStringArray("[\"a\",\"b\"]")).toEqual(["a", "b"]);
  });

  it("returns empty array for invalid values", () => {
    expect(parseJsonStringArray("invalid-json")).toEqual([]);
    expect(parseJsonStringArray("{\"a\":1}")).toEqual([]);
    expect(parseJsonStringArray("[1,2,3]")).toEqual([]);
  });
});
