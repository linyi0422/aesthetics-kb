import { describe, expect, it } from "vitest";
import { safeCompare, sha256Hex } from "./auth";

describe("auth utilities", () => {
  it("sha256Hex is deterministic", () => {
    const input = "test@example.com";
    expect(sha256Hex(input)).toBe(sha256Hex(input));
  });

  it("safeCompare returns true only for identical strings", () => {
    expect(safeCompare("admin-token", "admin-token")).toBe(true);
    expect(safeCompare("admin-token", "admin-token-x")).toBe(false);
    expect(safeCompare("admin-token", "ADMIN-token")).toBe(false);
  });
});
