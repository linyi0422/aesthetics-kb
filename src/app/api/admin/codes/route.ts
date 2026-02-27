import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, newId } from "@/server/db";
import { safeCompare, sha256Hex } from "@/server/auth";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function generateCode(): string {
  // Human-friendly enough, still high entropy.
  return crypto.randomBytes(12).toString("hex");
}

export async function POST(req: Request) {
  const db = getDb();
  const adminToken = process.env.ADMIN_TOKEN ?? "";
  const provided = req.headers.get("x-admin-token") ?? "";
  if (!adminToken || !safeCompare(provided, adminToken)) return unauthorized();

  const body = await req.json().catch(() => null);
  const count = Number.isFinite(body?.count) ? Number(body.count) : 0;
  const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt.trim() ? body.expiresAt.trim() : null;
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    return NextResponse.json({ error: "invalid_count" }, { status: 400 });
  }
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "invalid_expires_at" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const codes: string[] = [];
  try {
    db.exec("BEGIN IMMEDIATE;");
    const insert = db.prepare(
      "INSERT INTO redeem_codes (id, code_hash, status, entitlement, max_uses, used_count, expires_at, created_at, redeemed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );

    for (let i = 0; i < count; i += 1) {
      const code = generateCode();
      const codeHash = sha256Hex(code);
      insert.run(newId(), codeHash, "active", "all", 1, 0, expiresAt, now, null);
      codes.push(code);
    }
    db.exec("COMMIT;");
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // ignore rollback failures
    }
    console.error("[admin.codes] Failed to generate codes", {
      count,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, codes });
}
