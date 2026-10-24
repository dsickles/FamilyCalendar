import { defineConfig, devices } from "@playwright/test";
import {
  AUTH_PORT,
  DEMO_PORT,
  TEST_FEED_URL,
  TEST_PIN,
} from "./e2e/gate-env";

// Both servers run the same production build. Only runtime env differs:
// demo has no PIN or feeds, auth has a PIN and the fixture feed. Blank any
// PIN or feed inherited from the shell (CI sets them for the build).
const emptyFeeds: Record<string, string> = { DASHBOARD_PIN: "" };
for (const key of Object.keys(process.env)) {
  if (/^CAL_[A-Z0-9]+_URL$/.test(key)) {
    emptyFeeds[key] = "";
  }
}

// Set PLAYWRIGHT_CHROMIUM_PATH to reuse a preinstalled Chromium.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "demo",
      testMatch: ["layout.spec.ts", "demo.spec.ts", "wall.spec.ts"],
      use: { baseURL: `http://127.0.0.1:${DEMO_PORT}` },
    },
    {
      name: "auth",
      testMatch: ["auth.spec.ts"],
      use: { baseURL: `http://127.0.0.1:${AUTH_PORT}` },
    },
  ],
  // Never reuse a running server: a stale one may have the wrong env or build.
  // `next start` warns under `output: "standalone"` but serves the same
  // build, proxy included, without copying static assets into standalone.
  webServer: [
    {
      command: `npx next start -p ${DEMO_PORT}`,
      url: `http://127.0.0.1:${DEMO_PORT}/api/health`,
      env: emptyFeeds,
      reuseExistingServer: false,
    },
    {
      command: `npx next start -p ${AUTH_PORT}`,
      url: `http://127.0.0.1:${AUTH_PORT}/api/health`,
      env: {
        ...emptyFeeds,
        DASHBOARD_PIN: TEST_PIN,
        CAL_TEST_URL: TEST_FEED_URL,
        CAL_TEST_LABEL: "Test",
      },
      reuseExistingServer: false,
    },
  ],
});
