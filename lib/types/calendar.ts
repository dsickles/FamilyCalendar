import type { CalendarSource } from "@/lib/config";

export interface RawIcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  rrule?: unknown;
  exdate?: Record<string, Date>;
  recurrenceId?: Date;
  isAllDay: boolean;
  tzid?: string;
}

export interface UnifiedEvent {
  id: string;
  calendarId: string;
  calendarLabel: string;
  calendarColor: string;
  calendarCategory: CalendarSource["category"];
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  isRecurring: boolean;
  originalUid: string;
}

export interface CalendarFeedError {
  calendarId: string;
  calendarLabel: string;
  reason: "timeout" | "network" | "parse" | "unknown";
}

export interface CalendarApiResponse {
  events: UnifiedEvent[];
  fetchedAt: string;
  stale: boolean;
  cache: "hit" | "miss" | "stale";
  errors: CalendarFeedError[];
}
