"use client";

import { useRef, type PointerEvent } from "react";
import {
  formatTime,
  getDayBounds,
  zonedDateTime,
  type TimeFormat,
  type WeekStartDay,
} from "@/lib/date-utils";
import { eventsMatchingFilters } from "@/lib/calendar-filters";
import { useCalendar } from "@/lib/hooks/useCalendar";
import type { UnifiedEvent } from "@/lib/types/calendar";
import ViewToolbar from "@/components/calendar/ViewToolbar";

type DayViewProps = {
  timezone: string;
  timeFormat: TimeFormat;
  weekStartDay: WeekStartDay;
  selectedDay: string;
  activeFilters: string[];
  onShowMonth: () => void;
  onShowWeek: () => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
};

function dateFromKey(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return zonedDateTime(year, month, day, 12, 0, 0, timeZone);
}

function eventsOnDay(events: UnifiedEvent[], day: Date, timeZone: string): UnifiedEvent[] {
  const bounds = getDayBounds(day, timeZone);
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  return events
    .filter((event) => {
      const eventStart = Date.parse(event.startTime);
      const eventEnd = Date.parse(event.endTime);
      return eventStart < endMs && eventEnd > startMs;
    })
    .sort((left, right) => {
      const byTime = left.startTime.localeCompare(right.startTime);
      if (byTime !== 0) {
        return byTime;
      }
      return left.id.localeCompare(right.id);
    });
}

function EventRow({
  event,
  timeLabel,
}: {
  event: UnifiedEvent;
  timeLabel: string;
}) {
  return (
    <div
      className="rounded-md bg-white/5 py-2 pr-3 pl-3"
      style={{ borderLeft: `3px solid ${event.calendarColor}` }}
    >
      <p className="text-xs text-text-muted">{timeLabel}</p>
      <p className="truncate text-base text-text-primary">{event.title}</p>
      <p className="truncate text-sm text-text-secondary">{event.calendarLabel}</p>
      {event.location ? (
        <p className="truncate text-sm text-text-muted">{event.location}</p>
      ) : null}
    </div>
  );
}

export default function DayView({
  timezone,
  timeFormat,
  weekStartDay,
  selectedDay,
  activeFilters,
  onShowMonth,
  onShowWeek,
  onPreviousDay,
  onNextDay,
}: DayViewProps) {
  void weekStartDay;
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const blockClickRef = useRef<((event: MouseEvent) => void) | null>(null);
  const { data, error } = useCalendar();
  const selected = dateFromKey(selectedDay, timezone);
  const heading = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(selected);
  const events = data?.events
    ? eventsMatchingFilters(data.events, activeFilters)
    : undefined;
  const unavailable = Boolean(error) && !data?.events;
  const dayEvents = events ? eventsOnDay(events, selected, timezone) : null;
  const allDay = dayEvents?.filter((event) => event.isAllDay) ?? [];
  const timed = dayEvents?.filter((event) => !event.isAllDay) ?? [];

  function clearBlockedClick(target: HTMLElement) {
    if (!blockClickRef.current) {
      return;
    }
    target.removeEventListener("click", blockClickRef.current, { capture: true });
    blockClickRef.current = null;
  }

  function onSwipeStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    clearBlockedClick(event.currentTarget);
    swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onSwipeEnd(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== event.pointerId) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) {
      return;
    }
    const blockClick = (clickEvent: MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      if (blockClickRef.current === blockClick) {
        blockClickRef.current = null;
      }
    };
    blockClickRef.current = blockClick;
    event.currentTarget.addEventListener("click", blockClick, { capture: true, once: true });
    if (dx < 0) {
      onNextDay();
    } else {
      onPreviousDay();
    }
  }

  function onSwipeCancel(event: PointerEvent<HTMLDivElement>) {
    if (swipeStart.current?.id === event.pointerId) {
      swipeStart.current = null;
    }
  }

  return (
    <section aria-label="Day" className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-2 pb-3">
      <ViewToolbar
        title={heading}
        previousLabel="Previous day"
        nextLabel="Next day"
        onPrevious={onPreviousDay}
        onNext={onNextDay}
        onShowWeek={onShowWeek}
        onShowFourWeeks={onShowMonth}
      />
      {unavailable ? (
        <p className="shrink-0 pt-3 text-sm text-text-muted">Calendar unavailable</p>
      ) : null}
      <div
        className="mt-3 flex min-h-0 flex-1 touch-pan-y flex-col gap-2 overflow-hidden"
        onPointerDown={onSwipeStart}
        onPointerUp={onSwipeEnd}
        onPointerCancel={onSwipeCancel}
      >
        {allDay.map((event) => (
          <EventRow key={event.id} event={event} timeLabel="All day" />
        ))}
        {timed.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            timeLabel={`${formatTime(new Date(event.startTime), timeFormat, timezone)} – ${formatTime(new Date(event.endTime), timeFormat, timezone)}`}
          />
        ))}
        {dayEvents && dayEvents.length === 0 ? (
          <p className="text-sm text-text-muted">No events</p>
        ) : null}
      </div>
    </section>
  );
}
