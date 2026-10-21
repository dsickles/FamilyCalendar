import { describe, expect, it } from "vitest";
import {
  calendarDateParts,
  formatTime,
  getDayBounds,
  getWeekBounds,
  getWeeksInRange,
  getWindowEnd,
  getWindowStart,
  isSameDay,
  zonedDateTime,
} from "@/lib/date-utils";

const NY = "America/New_York";

describe("zonedDateTime", () => {
  it("converts New York wall time to UTC in daylight time", () => {
    expect(zonedDateTime(2026, 7, 1, 9, 0, 0, NY).toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
  });

  it("converts New York wall time to UTC in standard time", () => {
    expect(zonedDateTime(2026, 12, 1, 9, 0, 0, NY).toISOString()).toBe(
      "2026-12-01T14:00:00.000Z",
    );
  });

  it("handles other zones", () => {
    expect(zonedDateTime(2026, 7, 1, 9, 0, 0, "Europe/London").toISOString()).toBe(
      "2026-07-01T08:00:00.000Z",
    );
  });
});

describe("day and window bounds", () => {
  it("uses the dashboard day, not the UTC day", () => {
    // 02:00 UTC on Oct 21 is still Oct 20 in New York.
    const lateEvening = new Date("2026-10-21T02:00:00.000Z");
    const { start, end } = getDayBounds(lateEvening, NY);
    expect(start.toISOString()).toBe("2026-10-20T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-21T03:59:59.999Z");
  });

  it("is 25 hours long on the day daylight time ends", () => {
    const { start, end } = getDayBounds(new Date("2026-11-01T16:00:00.000Z"), NY);
    expect(end.getTime() + 1 - start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("offsets the window by whole local days", () => {
    const today = new Date("2026-10-20T16:00:00.000Z");
    expect(getWindowStart(today, -7, NY).toISOString()).toBe("2026-10-13T04:00:00.000Z");
    expect(getWindowEnd(today, 45, NY).toISOString()).toBe("2026-12-05T04:59:59.999Z");
  });
});

describe("week bounds", () => {
  const tuesday = new Date("2026-10-20T16:00:00.000Z");

  it("starts on Sunday when weekStartDay is 0", () => {
    const { start, end } = getWeekBounds(tuesday, 0, NY);
    expect(calendarDateParts(start, NY)).toEqual({ year: 2026, month: 10, day: 18 });
    expect(calendarDateParts(end, NY)).toEqual({ year: 2026, month: 10, day: 24 });
  });

  it("starts on Monday when weekStartDay is 1", () => {
    const { start, end } = getWeekBounds(tuesday, 1, NY);
    expect(calendarDateParts(start, NY)).toEqual({ year: 2026, month: 10, day: 19 });
    expect(calendarDateParts(end, NY)).toEqual({ year: 2026, month: 10, day: 25 });
  });

  it("lists each week start in a range", () => {
    const weeks = getWeeksInRange(
      new Date("2026-10-20T16:00:00.000Z"),
      new Date("2026-11-10T16:00:00.000Z"),
      0,
      NY,
    );
    expect(weeks.map((week) => calendarDateParts(week, NY).day)).toEqual([18, 25, 1, 8]);
  });
});

describe("formatting and comparison", () => {
  const nineThirty = new Date("2026-10-20T13:30:00.000Z");

  it("formats 12-hour and 24-hour times in the dashboard zone", () => {
    // ICU versions differ on the space before AM (U+0020 or U+202F).
    expect(formatTime(nineThirty, "12h", NY).replace(/\s/u, " ")).toBe("9:30 AM");
    expect(formatTime(new Date("2026-10-20T19:05:00.000Z"), "24h", NY)).toBe("15:05");
  });

  it("compares days in the dashboard zone", () => {
    const lateEvening = new Date("2026-10-21T02:00:00.000Z");
    expect(isSameDay(nineThirty, lateEvening, NY)).toBe(true);
    expect(isSameDay(nineThirty, lateEvening, "UTC")).toBe(false);
  });
});
