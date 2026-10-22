"use client";

import { useMemo } from "react";
import { useCalendar } from "@/lib/hooks/useCalendar";
import { FAMILY, SAMPLE_PEOPLE, sampleEvents } from "@/lib/wall/sample-data";
import type { WallEvent, WallPerson } from "@/lib/wall/types";

function inkFor(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    return "#FFFFFF";
  }
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111111" : "#FFFFFF";
}

/**
 * People and events for the Today tab. In demo mode it uses a full sample
 * day (the calendar demo data is built for grid overflow tests, not for a
 * realistic day). With real feeds it reads /api/calendar and makes one lane
 * per person calendar plus one for shared calendars.
 */
export function useWallEvents(isDemoMode: boolean, dayStamp: string) {
  const { data } = useCalendar();

  return useMemo(() => {
    if (isDemoMode || !data) {
      return {
        people: [...SAMPLE_PEOPLE, FAMILY],
        events: isDemoMode ? sampleEvents() : [],
        sample: isDemoMode,
      };
    }
    const people: WallPerson[] = [];
    const seen = new Set<string>();
    for (const event of data.events) {
      if (event.calendarCategory === "person" && !seen.has(event.calendarId)) {
        seen.add(event.calendarId);
        people.push({
          id: event.calendarId,
          name: event.calendarLabel,
          color: event.calendarColor,
          ink: inkFor(event.calendarColor),
        });
      }
    }
    people.push(FAMILY);
    const events: WallEvent[] = data.events.map((event) => ({
      id: event.id,
      title: event.title,
      location: event.location,
      start: Date.parse(event.startTime),
      end: Date.parse(event.endTime),
      allDay: event.isAllDay,
      personId: seen.has(event.calendarId) ? event.calendarId : FAMILY.id,
    }));
    return { people, events, sample: false };
    // dayStamp re-derives the sample day after midnight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, data, dayStamp]);
}
