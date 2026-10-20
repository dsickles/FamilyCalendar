import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAndParseCalendars } from "@/lib/calendar-engine";
import type { CalendarSource } from "@/lib/config";
import { zonedDateTime } from "@/lib/date-utils";
import type { UnifiedEvent } from "@/lib/types/calendar";

const TZ = "America/New_York";
const windowStart = zonedDateTime(2026, 9, 14, 0, 0, 0, TZ);
const windowEnd = zonedDateTime(2026, 10, 31, 23, 59, 59, TZ);

function source(overrides: Partial<CalendarSource> = {}): CalendarSource {
  return {
    id: "mock",
    label: "Mock",
    icsUrl: "fixture:mock.ics",
    color: "#6366f1",
    enabled: true,
    category: "shared",
    ...overrides,
  };
}

function titled(events: UnifiedEvent[], title: string): UnifiedEvent[] {
  return events.filter((event) => event.title === title);
}

beforeEach(() => {
  vi.stubEnv("TIMEZONE", TZ);
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchAndParseCalendars with mock.ics", () => {
  it("parses a timed single event with its zone offset", async () => {
    const { events, errors } = await fetchAndParseCalendars(
      [source()],
      windowStart,
      windowEnd,
    );
    expect(errors).toEqual([]);
    const [standup] = titled(events, "Team standup");
    expect(standup).toMatchObject({
      startTime: "2026-09-21T13:00:00.000Z",
      endTime: "2026-09-21T13:30:00.000Z",
      location: "Conference room A",
      isAllDay: false,
      isRecurring: false,
      calendarId: "mock",
      calendarLabel: "Mock",
    });
  });

  it("anchors all-day events to local midnight in the dashboard timezone", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    const [closed] = titled(events, "Office closed");
    expect(closed.isAllDay).toBe(true);
    expect(closed.startTime).toBe("2026-09-25T04:00:00.000Z");
    expect(closed.endTime).toBe("2026-09-26T04:00:00.000Z");
  });

  it("expands weekly recurrences and honors EXDATE", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    const planning = titled(events, "Weekly planning").map((e) => e.startTime);
    expect(planning).toContain("2026-09-14T14:00:00.000Z");
    expect(planning).not.toContain("2026-09-21T14:00:00.000Z");
    expect(planning).toContain("2026-09-28T14:00:00.000Z");
    expect(titled(events, "Weekly planning").every((e) => e.isRecurring)).toBe(true);
  });

  it("stops a COUNT-limited series after its last occurrence", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    expect(titled(events, "Focus lunch")).toHaveLength(5);
  });

  it("replaces an overridden occurrence instead of duplicating it", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    const moved = titled(events, "Book club (moved)");
    expect(moved).toHaveLength(1);
    expect(moved[0].startTime).toBe("2026-09-24T00:00:00.000Z");
    expect(moved[0].location).toBe("Cafe");
    const regular = titled(events, "Book club").map((e) => e.startTime);
    expect(regular).not.toContain("2026-09-23T23:00:00.000Z");
    expect(regular).toContain("2026-09-16T23:00:00.000Z");
  });

  it("keeps an override whose series is not in the feed", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    const [orphan] = titled(events, "Orphan override");
    expect(orphan.startTime).toBe("2026-09-30T15:15:00.000Z");
  });

  it("treats a floating time as dashboard-local time", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    const [checkin] = titled(events, "Floating check-in");
    expect(checkin.startTime).toBe("2026-09-24T19:00:00.000Z");
    expect(checkin.endTime).toBe("2026-09-24T20:00:00.000Z");
  });

  it("drops occurrences outside the window", async () => {
    const narrowEnd = zonedDateTime(2026, 9, 20, 23, 59, 59, TZ);
    const { events } = await fetchAndParseCalendars([source()], windowStart, narrowEnd);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(Date.parse(event.startTime)).toBeGreaterThanOrEqual(windowStart.getTime());
      expect(Date.parse(event.startTime)).toBeLessThanOrEqual(narrowEnd.getTime());
    }
    expect(titled(events, "Team standup")).toHaveLength(0);
  });

  it("returns events sorted by start time with no feed URL on them", async () => {
    const { events } = await fetchAndParseCalendars([source()], windowStart, windowEnd);
    const starts = events.map((event) => event.startTime);
    expect([...starts].sort()).toEqual(starts);
    for (const event of events) {
      expect(event).not.toHaveProperty("icsUrl");
      expect(JSON.stringify(event)).not.toContain("fixture:");
    }
  });
});

describe("feed isolation", () => {
  it("keeps healthy feeds when another feed fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new TypeError("fetch failed"));
    const { events, errors } = await fetchAndParseCalendars(
      [
        source(),
        source({ id: "dead", label: "Dead", icsUrl: "https://feeds.example.test/dead.ics" }),
      ],
      windowStart,
      windowEnd,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.calendarId === "mock")).toBe(true);
    expect(errors).toEqual([
      { calendarId: "dead", calendarLabel: "Dead", reason: "network" },
    ]);
  });

  it("reports a timeout when a feed aborts", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );
    const { errors } = await fetchAndParseCalendars(
      [source({ id: "slow", label: "Slow", icsUrl: "https://feeds.example.test/slow.ics" })],
      windowStart,
      windowEnd,
    );
    expect(errors).toEqual([
      { calendarId: "slow", calendarLabel: "Slow", reason: "timeout" },
    ]);
  });

  it("rejects fixture paths that try to leave the fixtures folder", async () => {
    const { events, errors } = await fetchAndParseCalendars(
      [source({ id: "escape", label: "Escape", icsUrl: "fixture:../../.env.local" })],
      windowStart,
      windowEnd,
    );
    expect(events).toEqual([]);
    expect(errors).toEqual([
      { calendarId: "escape", calendarLabel: "Escape", reason: "network" },
    ]);
  });

  it("skips disabled sources without fetching", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { events, errors } = await fetchAndParseCalendars(
      [source({ enabled: false, icsUrl: "https://feeds.example.test/off.ics" })],
      windowStart,
      windowEnd,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(errors).toEqual([]);
  });
});
