import { expect, test } from "@playwright/test";
import { TEST_PIN } from "./gate-env";

// Constitution Principle II: with a PIN set, everything but the unlock
// flow and the health check needs a session.

const json = { accept: "application/json" };

test("dashboard redirects to /unlock without a session", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(response.status());
  expect(new URL(response.headers().location, "http://x").pathname).toBe("/unlock");
});

for (const path of ["/api/calendar", "/api/weather"]) {
  test(`${path} returns 401 without a session`, async ({ request }) => {
    const response = await request.get(path, { headers: json, maxRedirects: 0 });
    expect(response.status()).toBe(401);
  });
}

test("/unlock stays reachable", async ({ request }) => {
  const response = await request.get("/unlock", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

test("/api/health stays reachable and reports live mode", async ({ request }) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: "ok", mode: "live" });
});

test("a forged session cookie is rejected", async ({ request }) => {
  const response = await request.get("/api/calendar", {
    headers: { ...json, cookie: "dash_session=forged.value" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(401);
});

test("the test PIN unlocks the fixture feed without exposing icsUrl", async ({
  request,
}) => {
  const unlock = await request.post("/api/auth/unlock", { data: { pin: TEST_PIN } });
  expect(unlock.status()).toBe(200);
  // Send the cookie by hand: it is Secure in production and this is http.
  const setCookie = unlock.headers()["set-cookie"] ?? "";
  const session = setCookie.split(";")[0];
  expect(session).toMatch(/^dash_session=./);

  const calendar = await request.get("/api/calendar", {
    headers: { ...json, cookie: session },
    maxRedirects: 0,
  });
  expect(calendar.status()).toBe(200);
  const text = await calendar.text();
  expect(JSON.parse(text).events.length).toBeGreaterThan(0);
  expect(text).not.toContain("icsUrl");
  expect(text).not.toContain("fixture:");
});
