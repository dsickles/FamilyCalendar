import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import {
  clientIp,
  createSessionCookie,
  rateLimitStatus,
  recordFailedAttempt,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifyPin,
} from "@/lib/auth";

function lockedResponse(resetAt: number) {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt - Date.now()) / 1000),
  );
  return NextResponse.json(
    {
      error: "Too many attempts. Try again later.",
      code: "rate_limited",
      resetAt,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimitStatus(ip);
  if (!limit.allowed) {
    return lockedResponse(limit.resetAt);
  }

  let pin = "";
  try {
    const body = (await request.json()) as { pin?: unknown };
    pin = typeof body.pin === "string" ? body.pin : "";
  } catch {
    const after = recordFailedAttempt(ip);
    if (!after.allowed) {
      return lockedResponse(after.resetAt);
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 401 });
  }

  const envPin = process.env.DASHBOARD_PIN ?? "";
  if (!(await verifyPin(pin, envPin))) {
    const after = recordFailedAttempt(ip);
    if (!after.allowed) {
      return lockedResponse(after.resetAt);
    }
    return NextResponse.json(
      {
        error: "Invalid PIN",
        remaining: after.remaining,
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createSessionCookie(),
    sessionCookieOptions(),
  );
  return response;
}

export function GET(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { mode: "demo", allowed: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const ip = clientIp(request.headers);
  const limit = rateLimitStatus(ip);
  if (!limit.allowed) {
    return lockedResponse(limit.resetAt);
  }

  return NextResponse.json(
    { allowed: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
