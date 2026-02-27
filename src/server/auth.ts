import crypto from "node:crypto";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const digestA = crypto.createHash("sha256").update(a).digest();
  const digestB = crypto.createHash("sha256").update(b).digest();
  return a.length === b.length && crypto.timingSafeEqual(digestA, digestB);
}
