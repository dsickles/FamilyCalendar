import { vi } from "vitest";

// Unit tests never touch the network. Any fetch a test does not mock fails
// loudly here instead of reaching a real host.
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Unmocked fetch in a unit test: ${String(input)}`);
  }),
);
