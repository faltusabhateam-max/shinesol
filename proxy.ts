import { NextRequest, NextResponse } from "next/server";
import { SHUTDOWN, SHUTDOWN_MESSAGE } from "@/lib/shutdown";

export function proxy(req: NextRequest) {
  if (!SHUTDOWN) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: SHUTDOWN_MESSAGE }, { status: 503, headers: { "Retry-After": "86400", "Cache-Control": "no-store" } });
  }
  if (pathname === "/shutdown") return NextResponse.next();
  return NextResponse.rewrite(new URL("/shutdown", req.url));
}

export const config = {
  matcher: ["/((?!_next/|brand/|fonts/|media/|avatars/|favicon\\.ico|apple-touch-icon\\.png|og\\.jpg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml).*)"],
};
