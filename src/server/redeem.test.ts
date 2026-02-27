import { describe, expect, it } from "vitest";
import { getRequestIp } from "./rate-limit";

describe("redeem route helpers", () => {
  it("extracts first ip from x-forwarded-for", () => {
    const req = new Request("http://localhost/api/redeem", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    });
    expect(getRequestIp(req)).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip and unknown", () => {
    const reqWithRealIp = new Request("http://localhost/api/redeem", {
      headers: {
        "x-real-ip": "198.51.100.7",
      },
    });
    const reqWithoutIp = new Request("http://localhost/api/redeem");

    expect(getRequestIp(reqWithRealIp)).toBe("198.51.100.7");
    expect(getRequestIp(reqWithoutIp)).toBe("unknown");
  });
});
