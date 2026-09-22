"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  calendarDateParts,
  formatTime,
  getDayBounds,
  getWindowStart,
  zonedDateTime,
  type TimeFormat,
  type WeekStartDay,
} from "@/lib/date-utils";
import { eventsMatchingFilters } from "@/lib/calendar-filters";
import { useCalendar } from "@/lib/hooks/useCalendar";
import type { UnifiedEvent } from "@/lib/types/calendar";
import ViewToolbar from "@/components/calendar/ViewToolbar";

type WeekViewProps = {
  timezone: string;
  timeFormat: TimeFormat;
  weekStartDay: WeekStartDay;
  selectedWeekStart: string;
  activeFilters: string[];
  onShowMonth: () => void;
  onSelectDay: (dateKey: string) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
};

const HOUR_HEIGHT = 48;
const HOUR_COUNT = 24;
const GRID_HEIGHT = HOUR_COUNT * HOUR_HEIGHT;
const DAY_COUNT = 7;

function dateFromKey(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return zonedDateTime(year, month, day, 12, 0, 0, timeZone);
}

function toDateKey(date: Date, timeZone: string): string {
  const { year, month, day } = calendarDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function zonedClock(date: Date, timeZone: string): { key: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  let hour = Number(map.hour);
  if (hour === 24) {
    hour = 0;
  }
  return {
    key: `${map.year}-${map.month}-${map.day}`,
    minutes: hour * 60 + Number(map.minute),
  };
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

function blockBox(
  event: UnifiedEvent,
  dayKey: string,
  timeZone: string,
): { top: number; height: number } | null {
  const start = zonedClock(new Date(event.startTime), timeZone);
  const end = zonedClock(new Date(event.endTime), timeZone);
  if (start.key > dayKey || end.key < dayKey) {
    return null;
  }
  const startMin = start.key < dayKey ? 0 : start.minutes;
  const endMin = end.key > dayKey ? 24 * 60 : end.minutes;
  if (endMin <= startMin) {
    return null;
  }
  return {
    top: (startMin / (24 * 60)) * GRID_HEIGHT,
    height: Math.max(22, ((endMin - startMin) / (24 * 60)) * GRID_HEIGHT),
  };
}

export default function WeekView({
  timezone,
  timeFormat,
  weekStartDay,
  selectedWeekStart,
  activeFilters,
  onShowMonth,
  onSelectDay,
  onPreviousWeek,
  onNextWeek,
}: WeekViewProps) {
  void weekStartDay;
  const { data, error } = useCalendar();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [todayKey, setTodayKey] = useState("");
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const anchor = dateFromKey(selectedWeekStart, timezone);
  const days = Array.from({ length: DAY_COUNT }, (_, index) =>
    getWindowStart(anchor, index, timezone),
  );
  const anchorParts = calendarDateParts(anchor, timezone);
  const events = data?.events
    ? eventsMatchingFilters(data.events, activeFilters)
    : undefined;
  const unavailable = Boolean(error) && !data?.events;

  useEffect(() => {
    let frame = 0;
    frame = requestAnimationFrame(() => {
      setTodayKey(toDateKey(new Date(), timezone));
    });
    return () => cancelAnimationFrame(frame);
  }, [timezone]);

  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    const measure = () => {
      const next = node.offsetWidth - node.clientWidth;
      setScrollbarWidth((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    const now = new Date();
    const nowKey = toDateKey(now, timezone);
    const weekAnchor = dateFromKey(selectedWeekStart, timezone);
    const weekDays = Array.from({ length: DAY_COUNT }, (_, index) =>
      getWindowStart(weekAnchor, index, timezone),
    );
    const containsToday = weekDays.some((day) => toDateKey(day, timezone) === nowKey);
    const hour = Math.floor(zonedClock(now, timezone).minutes / 60);
    node.scrollTop =
      containsToday && hour !== 0 ? (hour - 1) * HOUR_HEIGHT : 7 * HOUR_HEIGHT;
  }, [selectedWeekStart, timezone]);

  return (
    <section aria-label="Week" className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-2 pb-3">
      <ViewToolbar
        title={`${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: timezone }).format(days[0])} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: timezone }).format(days[6])}`}
        previousLabel="Previous week"
        nextLabel="Next week"
        onPrevious={onPreviousWeek}
        onNext={onNextWeek}
        onShowFourWeeks={onShowMonth}
      />
      {unavailable ? <p className="shrink-0 pt-2 text-sm text-text-muted">Calendar unavailable</p> : null}
      <div
        className="mt-3 grid shrink-0 grid-cols-[5rem_repeat(7,minmax(0,1fr))]"
        style={{ paddingRight: scrollbarWidth }}
      >
        <div />
        {days.map((day) => {
          const key = toDateKey(day, timezone);
          const isToday = key === todayKey;
          const label = new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: timezone,
          }).format(day);
          const weekday = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            timeZone: timezone,
          }).format(day);
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              onClick={() => onSelectDay(key)}
              className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md px-1 text-center font-[inherit] ${
                isToday ? "bg-white/8 ring-1 ring-today-ring ring-inset" : "bg-bg-card"
              }`}
            >
              <span className="text-[10px] tracking-wide text-text-muted uppercase">{weekday}</span>
              <span className="text-sm text-text-primary tabular-nums">
                {calendarDateParts(day, timezone).day}
              </span>
            </button>
          );
        })}
      </div>
      <div
        className="mt-1 grid h-12 shrink-0 grid-cols-[5rem_repeat(7,minmax(0,1fr))] overflow-hidden"
        style={{ paddingRight: scrollbarWidth }}
      >
        <div />
        {days.map((day) => {
          const key = toDateKey(day, timezone);
          const chips = events
            ? eventsOnDay(events, day, timezone).filter((event) => event.isAllDay)
            : [];
          return (
            <div key={key} className="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden px-0.5">
              {chips.map((event) => (
                <div
                  key={event.id}
                  className="truncate rounded-sm bg-white/5 py-0.5 pr-1 pl-1.5 text-xs text-text-primary"
                  style={{ borderLeft: `3px solid ${event.calendarColor}` }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div
        ref={scrollerRef}
        aria-label="Week hours"
        className="mt-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="relative" style={{ height: GRID_HEIGHT }}>
          {Array.from({ length: HOUR_COUNT }, (_, hour) => (
            <div
              key={hour}
              className="absolute right-0 left-0 grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] border-t border-border"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <div className="pr-2 text-right text-[10px] leading-5 text-text-muted">
                {formatTime(
                  zonedDateTime(
                    anchorParts.year,
                    anchorParts.month,
                    anchorParts.day,
                    hour,
                    0,
                    0,
                    timezone,
                  ),
                  timeFormat,
                  timezone,
                )}
              </div>
              {days.map((day) => (
                <div key={toDateKey(day, timezone)} className="border-l border-border" />
              ))}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-20 grid grid-cols-7">
            {days.map((day) => {
              const key = toDateKey(day, timezone);
              const blocks = events
                ? eventsOnDay(events, day, timezone).filter((event) => !event.isAllDay)
                : [];
              return (
                <div key={key} className="relative min-w-0">
                  {blocks.map((event) => {
                    const box = blockBox(event, key, timezone);
                    if (!box) {
                      return null;
                    }
                    return (
                      <div
                        key={event.id}
                        className="absolute right-0.5 left-0.5 overflow-hidden rounded-sm bg-white/5 px-1 text-xs leading-tight text-text-primary"
                        style={{
                          top: box.top,
                          height: box.height,
                          borderLeft: `3px solid ${event.calendarColor}`,
                        }}
                      >
                        <span className="block truncate">{event.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
