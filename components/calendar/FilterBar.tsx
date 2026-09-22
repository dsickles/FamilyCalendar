"use client";

import {
  calendarsFromEvents,
  isCalendarShown,
  toggleCalendar,
} from "@/lib/calendar-filters";
import { useCalendar } from "@/lib/hooks/useCalendar";

type FilterBarProps = {
  activeFilters: string[];
  onChange: (activeFilters: string[]) => void;
};

export default function FilterBar({ activeFilters, onChange }: FilterBarProps) {
  const { data } = useCalendar();
  const calendars = calendarsFromEvents(data?.events ?? []);
  const calendarIds = calendars.map((calendar) => calendar.id);

  return (
    <div
      role="group"
      aria-label="Filters"
      className="flex h-7 shrink-0 items-center gap-4 overflow-hidden px-6"
    >
      <span className="shrink-0 text-sm text-text-secondary">Filters:</span>
      {calendars.map((calendar) => {
        const shown = isCalendarShown(activeFilters, calendar.id);
        return (
          <button
            key={calendar.id}
            type="button"
            aria-pressed={shown}
            onClick={() => onChange(toggleCalendar(activeFilters, calendar.id, calendarIds))}
            className={`inline-flex h-7 shrink-0 items-center gap-1.5 text-sm text-text-primary ${
              shown ? "" : "opacity-35"
            }`}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: calendar.color }}
            />
            {calendar.label}
          </button>
        );
      })}
    </div>
  );
}
