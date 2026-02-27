import { NextResponse } from "next/server";
import { getDb, newId } from "@/server/db";
import { randomToken, sha256Hex } from "@/server/auth";
import { checkRateLimit, getRequestIp } from "@/server/rate-limit";

export const runtime = "nodejs";

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!code || !email) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const ip = getRequestIp(req);
  if (!checkRateLimit(`redeem:ip:${ip}`) || !checkRateLimit(`redeem:email:${email}`)) {
    console.error("[redeem] Rate limit exceeded", { ip, email });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const codeHash = sha256Hex(code);
  const now = new Date().toISOString();
  let token: string | null = null;
  let expiresAt: string | null = null;
  try {
    db.exec("BEGIN IMMEDIATE;");

    const redeem = db
      .prepare(
        "SELECT id, status, entitlement, max_uses, used_count, expires_at FROM redeem_codes WHERE code_hash = ?",
      )
      .get(codeHash) as
      | {
          id: string;
          status: string;
          entitlement: string;
          max_uses: number;
          used_count: number;
          expires_at: string | null;
        }
      | undefined;

    if (!redeem || redeem.status !== "active") {
      db.exec("ROLLBACK;");
      console.error("[redeem] Invalid code", { codeHashPrefix: codeHash.slice(0, 8), email });
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    if (redeem.expires_at && redeem.expires_at < now) {
      db.exec("ROLLBACK;");
      console.error("[redeem] Expired code", { codeHashPrefix: codeHash.slice(0, 8), email });
      return NextResponse.json({ error: "expired_code" }, { status: 400 });
    }

    if (redeem.used_count >= redeem.max_uses) {
      db.exec("ROLLBACK;");
      console.error("[redeem] Used up code", { codeHashPrefix: codeHash.slice(0, 8), email });
      return NextResponse.json({ error: "code_used_up" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
    let userId: string;
    if (existing) {
      userId = existing.id;
      db.prepare("UPDATE users SET updated_at = ? WHERE id = ?").run(now, userId);
    } else {
      userId = newId();
      db.prepare("INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
        userId,
        email,
        now,
        now,
      );
    }

    db.prepare(
      "INSERT INTO entitlements (id, user_id, kind, value, starts_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(newId(), userId, redeem.entitlement, null, now, null, now);

    const newUsedCount = redeem.used_count + 1;
    const newStatus = newUsedCount >= redeem.max_uses ? "redeemed" : "active";
    db.prepare("UPDATE redeem_codes SET used_count = ?, status = ?, redeemed_at = ? WHERE id = ?").run(
      newUsedCount,
      newStatus,
      now,
      redeem.id,
    );

    token = randomToken();
    const tokenHash = sha256Hex(token);
    expiresAt = addDaysIso(30);
    db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
      newId(),
      userId,
      tokenHash,
      expiresAt,
      now,
    );

    db.exec("COMMIT;");
  } catch (e) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // ignore rollback failures
    }
    console.error("[redeem] Server error", {
      email,
      codeHashPrefix: codeHash.slice(0, 8),
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!token || !expiresAt) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
  return res;
}
