import type { UnifiedEvent } from "@/lib/types/calendar";

const CALENDARS = [
  {
    calendarId: "alex",
    calendarLabel: "Alex",
    calendarColor: "#6366f1",
    calendarCategory: "person" as const,
  },
  {
    calendarId: "jordan",
    calendarLabel: "Jordan",
    calendarColor: "#ec4899",
    calendarCategory: "person" as const,
  },
  {
    calendarId: "family",
    calendarLabel: "Family",
    calendarColor: "#10b981",
    calendarCategory: "shared" as const,
  },
  {
    calendarId: "school",
    calendarLabel: "School",
    calendarColor: "#8b5cf6",
    calendarCategory: "external" as const,
  },
] as const;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function atTime(day: Date, hours: number, minutes: number): Date {
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function addDays(day: Date, count: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + count);
  return next;
}

function eventId(calendarId: string, uid: string, start: Date): string {
  return `${calendarId}::${uid}::${start.toISOString()}`;
}

const TITLES = [
  "Standup with the whole product team and design partners",
  "Deep work",
  "Client call with the regional planning committee this afternoon",
  "School pickup",
  "Family dinner at grandparents' house in the city on the west side",
  "Yoga",
  "Piano lesson",
  "Soccer practice",
  "Grocery run",
  "Library visit",
  "Office hours",
  "Design review",
  "Field trip",
  "Book club",
  "Game night",
  "Train to city",
  "Parent conference",
  "Swim lesson",
  "Picture day",
  "Apple picking",
  "Sprint review",
  "Play rehearsal",
  "Budget review",
  "Hardware store",
];

// Counts are offsets from today. On 2026-09-22 the 4-week grid is Sep 20–Oct 17.
// 1–8 are fully visible when the cell is tall enough. 12, 15, and 18 overflow
// on every target viewport, and each leaves a different "+N more" count.
const DAY_COUNTS: Record<number, number> = {
  [-2]: 1, // Sep 20
  [-1]: 2, // Sep 21
  0: 3, // Sep 22, today
  1: 4, // Sep 23
  2: 5, // Sep 24
  3: 12, // Sep 25, overflow
  4: 6, // Sep 26
  5: 7, // Sep 27
  6: 8, // Sep 28
  9: 15, // Oct 1, overflow
  22: 18, // Oct 14, overflow
};

function countForOffset(offset: number): number {
  if (Object.prototype.hasOwnProperty.call(DAY_COUNTS, offset)) {
    return DAY_COUNTS[offset];
  }
  if (offset >= 7 && offset <= 25) {
    return offset % 2 === 0 ? 2 : 1;
  }
  return 0;
}

export function generateDemoEvents(now = new Date()): UnifiedEvent[] {
  const today = startOfDay(now);
  const events: UnifiedEvent[] = [];

  for (let offset = -2; offset <= 25; offset += 1) {
    const count = countForOffset(offset);
    const day = addDays(today, offset);
    for (let index = 0; index < count; index += 1) {
      const calendar = CALENDARS[index % CALENDARS.length];
      const minutes = 8 * 60 + index * 30;
      const start = atTime(day, Math.floor(minutes / 60), minutes % 60);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const uid = `d${offset}-n${index}`;
      const title = TITLES[(index + Math.abs(offset)) % TITLES.length];
      events.push({
        id: eventId(calendar.calendarId, uid, start),
        calendarId: calendar.calendarId,
        calendarLabel: calendar.calendarLabel,
        calendarColor: calendar.calendarColor,
        calendarCategory: calendar.calendarCategory,
        title,
        description: "",
        location: "",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isAllDay: false,
        isRecurring: false,
        originalUid: uid,
      });
    }
  }

  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
