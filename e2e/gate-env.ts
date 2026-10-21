/**
 * Shared values for the compliance gates. The build, the bundle scan, and
 * the auth server all read the same test PIN and feed so a leak is caught.
 */
export const TEST_PIN = process.env.GATE_TEST_PIN ?? "73914826";
export const TEST_FEED_URL = "fixture:mock.ics";

export const DEMO_PORT = 3100;
export const AUTH_PORT = 3101;

export const VIEWPORTS = [
  { width: 1180, height: 820 },
  { width: 1366, height: 1024 },
  { width: 1920, height: 1080 },
] as const;
