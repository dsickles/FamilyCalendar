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

function seedForToday(now: Date): number {
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function eventId(
  calendarId: string,
  uid: string,
  start: Date,
): string {
  return `${calendarId}::${uid}::${start.toISOString()}`;
}

export function generateDemoEvents(now = new Date()): UnifiedEvent[] {
  const today = startOfDay(now);
  const seed = seedForToday(now);
  const events: UnifiedEvent[] = [];

  const templates: Array<{
    calendar: (typeof CALENDARS)[number];
    uid: string;
    title: string;
    location: string;
    description: string;
    dayOffset: number;
    startHour: number;
    startMinute: number;
    durationHours: number;
    isAllDay?: boolean;
    isRecurring?: boolean;
  }> = [
    { calendar: CALENDARS[0], uid: "standup", title: "Standup", location: "Home office", description: "Daily team sync", dayOffset: 0, startHour: 9, startMinute: 0, durationHours: 0.5, isRecurring: true },
    { calendar: CALENDARS[0], uid: "deep-work", title: "Deep work block", location: "", description: "Focus time", dayOffset: 0, startHour: 10, startMinute: 0, durationHours: 2 },
    { calendar: CALENDARS[1], uid: "client-call", title: "Client call", location: "Zoom", description: "Quarterly check-in", dayOffset: 0, startHour: 14, startMinute: 0, durationHours: 1 },
    { calendar: CALENDARS[2], uid: "dinner", title: "Family dinner", location: "Home", description: "", dayOffset: 0, startHour: 18, startMinute: 30, durationHours: 1 },
    { calendar: CALENDARS[3], uid: "pickup", title: "School pickup", location: "Ridge Elementary", description: "", dayOffset: 0, startHour: 15, startMinute: 15, durationHours: 0.5 },
    { calendar: CALENDARS[0], uid: "1on1", title: "1:1 with Sam", location: "Office", description: "", dayOffset: 1, startHour: 11, startMinute: 0, durationHours: 0.75 },
    { calendar: CALENDARS[1], uid: "yoga", title: "Yoga", location: "Studio", description: "", dayOffset: 1, startHour: 7, startMinute: 30, durationHours: 1 },
    { calendar: CALENDARS[2], uid: "groceries", title: "Groceries", location: "Market", description: "", dayOffset: 1, startHour: 17, startMinute: 0, durationHours: 1 },
    { calendar: CALENDARS[3], uid: "pta", title: "PTA meeting", location: "School library", description: "", dayOffset: 1, startHour: 19, startMinute: 0, durationHours: 1 },
    { calendar: CALENDARS[0], uid: "dentist", title: "Dentist", location: "Main St Dental", description: "", dayOffset: 2, startHour: 8, startMinute: 30, durationHours: 1 },
    { calendar: CALENDARS[1], uid: "design-review", title: "Design review", location: "Office", description: "", dayOffset: 2, startHour: 13, startMinute: 0, durationHours: 1.5 },
    { calendar: CALENDARS[2], uid: "movie", title: "Movie night", location: "Home", description: "Kids pick", dayOffset: 2, startHour: 19, startMinute: 30, durationHours: 2 },
    { calendar: CALENDARS[3], uid: "early-release", title: "Early release", location: "Ridge Elementary", description: "", dayOffset: 2, startHour: 0, startMinute: 0, durationHours: 24, isAllDay: true },
    { calendar: CALENDARS[2], uid: "birthday", title: "Aunt's birthday", location: "", description: "", dayOffset: 3, startHour: 0, startMinute: 0, durationHours: 24, isAllDay: true },
    { calendar: CALENDARS[0], uid: "sprint-planning", title: "Sprint planning", location: "Office", description: "", dayOffset: 3, startHour: 10, startMinute: 0, durationHours: 2 },
    { calendar: CALENDARS[1], uid: "run", title: "Evening run", location: "Park loop", description: "", dayOffset: 3, startHour: 18, startMinute: 0, durationHours: 0.75 },
    { calendar: CALENDARS[3], uid: "soccer", title: "Soccer practice", location: "North field", description: "", dayOffset: 3, startHour: 16, startMinute: 0, durationHours: 1.5, isRecurring: true },
    { calendar: CALENDARS[2], uid: "trash", title: "Trash / recycling", location: "Curb", description: "", dayOffset: 4, startHour: 0, startMinute: 0, durationHours: 24, isAllDay: true },
    { calendar: CALENDARS[0], uid: "office-hours", title: "Office hours", location: "Home office", description: "", dayOffset: 4, startHour: 15, startMinute: 0, durationHours: 1 },
    { calendar: CALENDARS[1], uid: "budget", title: "Budget review", location: "", description: "", dayOffset: 4, startHour: 20, startMinute: 0, durationHours: 0.5 },
    { calendar: CALENDARS[3], uid: "concert", title: "School concert", location: "Auditorium", description: "Arrive 15 min early", dayOffset: 5, startHour: 18, startMinute: 0, durationHours: 1.5 },
    { calendar: CALENDARS[2], uid: "brunch", title: "Brunch with grandparents", location: "Home", description: "", dayOffset: 6, startHour: 11, startMinute: 0, durationHours: 2 },
    { calendar: CALENDARS[0], uid: "errands", title: "Hardware store", location: "Town Center", description: "", dayOffset: 6, startHour: 9, startMinute: 30, durationHours: 1 },
    { calendar: CALENDARS[1], uid: "book-club", title: "Book club", location: "Cafe", description: "", dayOffset: 7, startHour: 19, startMinute: 0, durationHours: 1.5 },
    { calendar: CALENDARS[2], uid: "hike", title: "Family hike", location: "Saxon Woods", description: "", dayOffset: 7, startHour: 10, startMinute: 0, durationHours: 3 },
    { calendar: CALENDARS[3], uid: "closed", title: "School closed", location: "", description: "Staff development", dayOffset: 8, startHour: 0, startMinute: 0, durationHours: 24, isAllDay: true },
    { calendar: CALENDARS[0], uid: "travel", title: "Train to city", location: "Hartsdale station", description: "", dayOffset: -1, startHour: 8, startMinute: 15, durationHours: 1 },
    { calendar: CALENDARS[1], uid: "prior-meeting", title: "Vendor meeting", location: "Zoom", description: "", dayOffset: -1, startHour: 16, startMinute: 0, durationHours: 1 },
  ];

  // Keep order stable for a given day; seed currently reserved for future jitter.
  void seed;

  for (const template of templates) {
    const day = addDays(today, template.dayOffset);
    const start = template.isAllDay
      ? startOfDay(day)
      : atTime(day, template.startHour, template.startMinute);
    const end = new Date(
      start.getTime() + template.durationHours * 60 * 60 * 1000,
    );
    events.push({
      id: eventId(template.calendar.calendarId, template.uid, start),
      calendarId: template.calendar.calendarId,
      calendarLabel: template.calendar.calendarLabel,
      calendarColor: template.calendar.calendarColor,
      calendarCategory: template.calendar.calendarCategory,
      title: template.title,
      description: template.description,
      location: template.location,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAllDay: Boolean(template.isAllDay),
      isRecurring: Boolean(template.isRecurring),
      originalUid: template.uid,
    });
  }

  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
