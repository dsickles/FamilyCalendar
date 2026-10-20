import { expect, test } from "@playwright/test";

// With no PIN and no feeds the dashboard runs in demo mode and skips auth.

test("health reports demo mode", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: "ok", mode: "demo" });
});

test("dashboard and APIs are open without a session", async ({ request }) => {
  const home = await request.get("/", { maxRedirects: 0 });
  expect(home.status()).toBe(200);

  const calendar = await request.get("/api/calendar", {
    headers: { accept: "application/json" },
    maxRedirects: 0,
  });
  expect(calendar.status()).toBe(200);
  const body = await calendar.json();
  expect(body.events.length).toBeGreaterThan(0);
});
