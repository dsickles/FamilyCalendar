import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clientIp,
  createSessionCookie,
  recordFailedAttempt,
  rateLimitStatus,
  sessionCookieOptions,
  verifyPin,
  verifySessionCookie,
} from "@/lib/auth";

beforeEach(() => {
  vi.stubEnv("DASHBOARD_PIN", "4821");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("verifyPin", () => {
  it("accepts only the configured PIN", async () => {
    expect(await verifyPin("4821", "4821")).toBe(true);
    expect(await verifyPin("4822", "4821")).toBe(false);
    expect(await verifyPin("", "4821")).toBe(false);
    expect(await verifyPin("4821", "")).toBe(false);
  });
});

describe("session cookie", () => {
  it("round-trips a signed token", async () => {
    const token = await createSessionCookie();
    expect(await verifySessionCookie(token)).toBe(true);
  });

  it("rejects a tampered expiry", async () => {
    const [issued, expires, signature] = (await createSessionCookie()).split(".");
    const forged = `${issued}.${Number(expires) + 1}.${signature}`;
    expect(await verifySessionCookie(forged)).toBe(false);
  });

  it("rejects a token signed with a different PIN", async () => {
    const token = await createSessionCookie();
    vi.stubEnv("DASHBOARD_PIN", "9999");
    expect(await verifySessionCookie(token)).toBe(false);
  });

  it("expires after 30 days", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00.000Z") });
    const token = await createSessionCookie();
    vi.setSystemTime(new Date("2026-11-19T11:59:00.000Z"));
    expect(await verifySessionCookie(token)).toBe(true);
    vi.setSystemTime(new Date("2026-11-19T12:00:01.000Z"));
    expect(await verifySessionCookie(token)).toBe(false);
  });

  it("rejects malformed tokens", async () => {
    expect(await verifySessionCookie("")).toBe(false);
    expect(await verifySessionCookie("a.b")).toBe(false);
  });

  it("uses the constitution's cookie options", () => {
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: false,
      maxAge: 60 * 60 * 24 * 30,
    });
  });
});

describe("unlock rate limit", () => {
  it("locks an IP after 5 failures for 15 minutes", () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00.000Z") });
    const ip = "203.0.113.7";
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect(recordFailedAttempt(ip).allowed).toBe(true);
    }
    expect(recordFailedAttempt(ip)).toMatchObject({ allowed: false, remaining: 0, count: 5 });
    expect(rateLimitStatus("198.51.100.1").allowed).toBe(true);
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(rateLimitStatus(ip)).toMatchObject({ allowed: true, count: 0 });
  });
});

describe("clientIp", () => {
  it("prefers the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe("203.0.113.8");
    expect(clientIp(new Headers())).toBe("local");
  });
});
