import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDemoMode } from "@/lib/config";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/auth";

const PUBLIC_PREFIXES = [
  "/unlock",
  "/api/auth/unlock",
  "/api/health",
  "/_next/",
  "/icons/",
];

const PUBLIC_EXACT = new Set([
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.ico",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (isDemoMode()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token && (await verifySessionCookie(token))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlock = request.nextUrl.clone();
  unlock.pathname = "/unlock";
  unlock.search = "";
  return NextResponse.redirect(unlock);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
