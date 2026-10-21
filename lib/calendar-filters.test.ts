import { describe, expect, it } from "vitest";
import {
  calendarsFromEvents,
  eventsMatchingFilters,
  isCalendarShown,
  toggleCalendar,
} from "@/lib/calendar-filters";
import type { UnifiedEvent } from "@/lib/types/calendar";

function event(calendarId: string, id: string): UnifiedEvent {
  return {
    id,
    calendarId,
    calendarLabel: calendarId.toUpperCase(),
    calendarColor: `#${calendarId.length}${calendarId.length}0000`,
    calendarCategory: "person",
    title: id,
    description: "",
    location: "",
    startTime: "2026-10-20T13:00:00.000Z",
    endTime: "2026-10-20T14:00:00.000Z",
    isAllDay: false,
    isRecurring: false,
    originalUid: id,
  };
}

const events = [event("alex", "a1"), event("jordan", "j1"), event("alex", "a2")];
const ids = ["alex", "jordan", "school"];

describe("calendarsFromEvents", () => {
  it("lists each calendar once in first-seen order", () => {
    expect(calendarsFromEvents(events).map((chip) => chip.id)).toEqual(["alex", "jordan"]);
  });
});

describe("filters", () => {
  it("shows everything when no filter is active", () => {
    expect(eventsMatchingFilters(events, [])).toBe(events);
    expect(isCalendarShown([], "alex")).toBe(true);
  });

  it("shows only the selected calendars", () => {
    expect(eventsMatchingFilters(events, ["jordan"]).map((e) => e.id)).toEqual(["j1"]);
    expect(isCalendarShown(["jordan"], "alex")).toBe(false);
  });
});

describe("toggleCalendar", () => {
  it("hides one calendar from the all-shown state", () => {
    expect(toggleCalendar([], "alex", ids)).toEqual(["jordan", "school"]);
  });

  it("returns to all-shown when the last hidden calendar comes back", () => {
    expect(toggleCalendar(["jordan", "school"], "alex", ids)).toEqual([]);
  });

  it("hides everything when the last shown calendar is turned off", () => {
    const none = toggleCalendar(["alex"], "alex", ids);
    expect(eventsMatchingFilters(events, none)).toEqual([]);
    expect(isCalendarShown(none, "alex")).toBe(false);
    expect(toggleCalendar(none, "jordan", ids)).toEqual(["jordan"]);
  });

  it("ignores unknown calendar ids", () => {
    expect(toggleCalendar([], "ghost", ids)).toEqual([]);
    expect(toggleCalendar(["alex"], "ghost", ids)).toEqual(["alex"]);
  });
});
