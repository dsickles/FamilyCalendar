import type { UnifiedEvent } from "@/lib/types/calendar";

const SHOW_NONE = "\u0000";

export type CalendarChip = {
  id: string;
  label: string;
  color: string;
};

export function calendarsFromEvents(events: readonly UnifiedEvent[]): CalendarChip[] {
  const seen = new Map<string, CalendarChip>();
  for (const event of events) {
    if (!event.calendarId || seen.has(event.calendarId)) {
      continue;
    }
    seen.set(event.calendarId, {
      id: event.calendarId,
      label: event.calendarLabel,
      color: event.calendarColor,
    });
  }
  return [...seen.values()];
}

export function isCalendarShown(
  activeFilters: readonly string[],
  calendarId: string,
): boolean {
  if (activeFilters.length === 0) {
    return true;
  }
  if (activeFilters.length === 1 && activeFilters[0] === SHOW_NONE) {
    return false;
  }
  return activeFilters.includes(calendarId);
}

export function eventsMatchingFilters(
  events: UnifiedEvent[],
  activeFilters: readonly string[],
): UnifiedEvent[] {
  if (activeFilters.length === 0) {
    return events;
  }
  if (activeFilters.length === 1 && activeFilters[0] === SHOW_NONE) {
    return [];
  }
  const allowed = new Set(activeFilters);
  return events.filter((event) => allowed.has(event.calendarId));
}

export function toggleCalendar(
  activeFilters: readonly string[],
  calendarId: string,
  calendarIds: readonly string[],
): string[] {
  const known = calendarIds.filter((id) => id.length > 0 && id !== SHOW_NONE);
  if (!known.includes(calendarId)) {
    return activeFilters.length === 0 ? [] : [...activeFilters];
  }
  const shown = new Set(
    activeFilters.length === 0
      ? known
      : activeFilters.filter((id) => id !== SHOW_NONE && known.includes(id)),
  );
  if (shown.has(calendarId)) {
    shown.delete(calendarId);
  } else {
    shown.add(calendarId);
  }
  if (shown.size === 0) {
    return [SHOW_NONE];
  }
  if (shown.size === known.length) {
    return [];
  }
  return known.filter((id) => shown.has(id));
}
