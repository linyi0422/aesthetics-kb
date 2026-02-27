import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate limit", () => {
  it("blocks after configured attempts", () => {
    const key = `unit:${Date.now()}`;
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });
});
