import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import {
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  if (!isDemoMode()) {
    response.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
  }
  return response;
}
