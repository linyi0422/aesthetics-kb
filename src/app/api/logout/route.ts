import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/server/db";
import { sha256Hex } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const db = getDb();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value ?? "";

  if (sessionToken) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256Hex(sessionToken));
  }

  const response = NextResponse.redirect(new URL("/redeem", req.url));
  response.cookies.set("session", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
