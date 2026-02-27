import { describe, expect, it } from "vitest";
import { buildLastEditedFilter } from "./query-filter";

describe("buildLastEditedFilter", () => {
  it("returns undefined for full sync", () => {
    expect(buildLastEditedFilter(null)).toBeUndefined();
  });

  it("builds last-edited filter for incremental sync", () => {
    const timestamp = "2026-02-24T12:00:00.000Z";
    expect(buildLastEditedFilter(timestamp)).toEqual({
      timestamp: "last_edited_time",
      last_edited_time: { after: timestamp },
    });
  });
});
