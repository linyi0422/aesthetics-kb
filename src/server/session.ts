import { cookies } from "next/headers";
import { getDb } from "@/server/db";
import { sha256Hex } from "@/server/auth";

export type SessionUser = {
  id: string;
  email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? "";
  if (!token) return null;

  const db = getDb();
  const tokenHash = sha256Hex(token);
  const row = db
    .prepare(
      "SELECT u.id as id, u.email as email, s.expires_at as expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
    )
    .get(tokenHash) as { id: string; email: string; expires_at: string } | undefined;

  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) return null;

  const nowIso = new Date().toISOString();
  const hasEntitlement = db
    .prepare("SELECT 1 FROM entitlements WHERE user_id = ? AND (ends_at IS NULL OR ends_at > ?) LIMIT 1")
    .get(row.id, nowIso) as { 1: number } | undefined;
  if (!hasEntitlement) return null;

  return { id: row.id, email: row.email };
}
