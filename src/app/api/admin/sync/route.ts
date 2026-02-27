import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncPublishedContent } from "@/server/notion/sync";
import { safeCompare } from "@/server/auth";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN ?? "";
  const provided = req.headers.get("x-admin-token") ?? "";
  if (!adminToken || !safeCompare(provided, adminToken)) return unauthorized();

  try {
    const result = await syncPublishedContent();
    revalidatePath("/lenses");
    revalidatePath("/search");
    revalidatePath("/l/[slug]", "page");
    revalidatePath("/e/[slug]", "page");
    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin.sync] Failed", { error: e instanceof Error ? e.message : String(e) });
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
