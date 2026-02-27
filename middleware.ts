import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (
    path === "/" ||
    path.startsWith("/redeem") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get("session")?.value;
  if (!session) return NextResponse.redirect(new URL("/redeem", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
