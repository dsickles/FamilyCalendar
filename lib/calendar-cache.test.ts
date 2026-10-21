import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCalendarCacheKey,
  getCalendarCache,
  getStaleCalendarCache,
  invalidateCalendarCache,
  setCalendarCache,
} from "@/lib/calendar-cache";

const start = new Date("2026-10-13T04:00:00.000Z");
const end = new Date("2026-12-05T04:59:59.999Z");

afterEach(() => {
  invalidateCalendarCache();
  vi.useRealTimers();
});

describe("buildCalendarCacheKey", () => {
  it("ignores source order and hides feed URLs", () => {
    const a = { id: "alex", icsUrl: "https://feeds.example.test/a.ics" };
    const b = { id: "jordan", icsUrl: "https://feeds.example.test/b.ics" };
    const key = buildCalendarCacheKey([a, b], start, end);
    expect(buildCalendarCacheKey([b, a], start, end)).toBe(key);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with the window", () => {
    const sources = [{ id: "alex", icsUrl: "fixture:mock.ics" }];
    expect(buildCalendarCacheKey(sources, start, end)).not.toBe(
      buildCalendarCacheKey(sources, new Date(start.getTime() + 1), end),
    );
  });
});

describe("calendar cache TTL", () => {
  it("serves fresh data until the TTL, then only as stale", () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00.000Z") });
    setCalendarCache("k", [], 600);
    expect(getCalendarCache("k")).toEqual([]);
    vi.advanceTimersByTime(600 * 1000);
    expect(getCalendarCache("k")).toBeNull();
    expect(getStaleCalendarCache("k")).toEqual([]);
  });

  it("prunes other expired entries on write", () => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00.000Z") });
    setCalendarCache("old", [], 60);
    vi.advanceTimersByTime(61 * 1000);
    setCalendarCache("new", [], 60);
    expect(getStaleCalendarCache("old")).toBeNull();
    expect(getCalendarCache("new")).toEqual([]);
  });
});
