const COOKIE_NAME = "dash_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type AttemptState = { count: number; resetAt: number };

const globalForAttempts = globalThis as typeof globalThis & {
  __dashPinAttempts?: Map<string, AttemptState>;
};

const attempts =
  globalForAttempts.__dashPinAttempts ??
  (globalForAttempts.__dashPinAttempts = new Map<string, AttemptState>());

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "strict";
  path: "/";
  secure: boolean;
  maxAge: number;
};

function signingSecret(): string {
  return process.env.DASHBOARD_PIN ?? "demo-unsigned";
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toHex(signature);
}

export async function hashPin(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pin),
  );
  return toHex(digest);
}

export async function verifyPin(pin: string, envPin: string): Promise<boolean> {
  if (!envPin || !pin) {
    return false;
  }
  const a = await hashPin(pin);
  const b = await hashPin(envPin);
  return safeEqual(a, b);
}

export async function createSessionCookie(): Promise<string> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_SECONDS * 1000;
  const payload = `${issuedAt}.${expiresAt}`;
  const signature = await hmacHex(payload, signingSecret());
  return `${payload}.${signature}`;
}

export async function verifySessionCookie(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [issuedAt, expiresAt, signature] = parts;
  const payload = `${issuedAt}.${expiresAt}`;
  const expected = await hmacHex(payload, signingSecret());
  if (!safeEqual(signature, expected)) {
    return false;
  }
  const exp = Number(expiresAt);
  return Number.isFinite(exp) && Date.now() < exp;
}

export function sessionCookieOptions(
  maxAge = SESSION_TTL_SECONDS,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export function clearSessionCookieOptions(): SessionCookieOptions {
  return sessionCookieOptions(0);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export function rateLimitStatus(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  count: number;
} {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || now >= current.resetAt) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      count: 0,
    };
  }
  const locked = current.count >= RATE_LIMIT_MAX;
  return {
    allowed: !locked,
    remaining: Math.max(0, RATE_LIMIT_MAX - current.count),
    resetAt: current.resetAt,
    count: current.count,
  };
}

export function recordFailedAttempt(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  count: number;
} {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || now >= current.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return rateLimitStatus(ip);
  }
  current.count += 1;
  return rateLimitStatus(ip);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "local";
  }
  return headers.get("x-real-ip") ?? "local";
}
