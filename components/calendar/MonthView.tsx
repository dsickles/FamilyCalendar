"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  calendarDateParts,
  getDayBounds,
  getWeekBounds,
  getWindowStart,
  type WeekStartDay,
} from "@/lib/date-utils";
import { eventsMatchingFilters } from "@/lib/calendar-filters";
import { useCalendar } from "@/lib/hooks/useCalendar";
import type { UnifiedEvent } from "@/lib/types/calendar";

type MonthViewProps = {
  timezone: string;
  weekStartDay: WeekStartDay;
  activeFilters: string[];
  onSelectDay: (dateKey: string) => void;
  onSelectWeek: (weekStartKey: string) => void;
};

const DAY_COUNT = 28;
const WEEK_COUNT = 4;
const GRID_COLS = "grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]";

function zonedDateKey(date: Date, timeZone: string): string {
  const { year, month, day } = calendarDateParts(date, timeZone);
  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}

function buildDays(today: Date, weekStartDay: WeekStartDay, timeZone: string): Date[] {
  const start = getWeekBounds(today, weekStartDay, timeZone).start;
  return Array.from({ length: DAY_COUNT }, (_, index) =>
    getWindowStart(start, index, timeZone),
  );
}

function rowsThatFit(available: number, row: number, gap: number): number {
  if (row <= 0 || available <= 0) {
    return 0;
  }
  let count = 0;
  while ((count + 1) * row + count * gap <= available + 0.5) {
    count += 1;
  }
  return count;
}

function dayHeading(
  day: Date,
  previous: Date | null,
  timeZone: string,
): { day: number; month: string | null } {
  const parts = calendarDateParts(day, timeZone);
  const previousParts = previous ? calendarDateParts(previous, timeZone) : null;
  const monthChanged =
    previousParts !== null &&
    (previousParts.month !== parts.month || previousParts.year !== parts.year);
  if (!monthChanged) {
    return { day: parts.day, month: null };
  }
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone,
  })
    .format(day)
    .toUpperCase();
  return { day: parts.day, month };
}

function isWeekend(day: Date, timeZone: string): boolean {
  const name = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(day);
  return name === "Sat" || name === "Sun";
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

export default function MonthView({
  timezone,
  weekStartDay,
  activeFilters,
  onSelectDay,
  onSelectWeek,
}: MonthViewProps) {
  const { data, error } = useCalendar();
  const [today, setToday] = useState<Date | null>(null);
  const [chipCapacity, setChipCapacity] = useState<number | null>(null);
  const chipListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let lastKey = "";

    const tick = () => {
      const date = new Date();
      const key = zonedDateKey(date, timezone);
      if (key !== lastKey) {
        lastKey = key;
        setToday(date);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timezone]);

  const events = data?.events
    ? eventsMatchingFilters(data.events, activeFilters)
    : undefined;
  const unavailable = Boolean(error) && !data?.events;
  const eventCount = events?.length ?? -1;
  const days = today ? buildDays(today, weekStartDay, timezone) : null;
  const todayKey = today ? zonedDateKey(today, timezone) : "";
  const probeDay = days?.find((day) => events && eventsOnDay(events, day, timezone).length > 0) ?? null;
  const probeKey = probeDay ? zonedDateKey(probeDay, timezone) : null;

  useLayoutEffect(() => {
    const node = chipListRef.current;
    if (!node) {
      return;
    }
    const measure = () => {
      const chip = node.querySelector<HTMLElement>("[data-event-chip]");
      if (!chip || node.clientHeight <= 0 || chip.offsetHeight <= 0) {
        return;
      }
      const gap = Number.parseFloat(getComputedStyle(node).rowGap) || 0;
      const capacity = rowsThatFit(node.clientHeight, chip.offsetHeight, gap);
      setChipCapacity((current) => (current === capacity ? current : capacity));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [eventCount, todayKey, probeKey]);
  const weekdayLabels = days
    ? days.slice(0, 7).map((day) =>
        new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          timeZone: timezone,
        }).format(day),
      )
    : [];

  return (
    <section
      aria-label="Month"
      className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-3"
    >
      {unavailable ? (
        <p className="shrink-0 pb-2 text-sm text-text-muted">Calendar unavailable</p>
      ) : null}
      <div className={`grid shrink-0 ${GRID_COLS} gap-1 pb-1`}>
        <div />
        {weekdayLabels.length > 0
          ? weekdayLabels.map((label) => (
              <div
                key={label}
                className="truncate text-center text-xs tracking-wide text-text-muted uppercase"
              >
                {label}
              </div>
            ))
          : Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-4" />
            ))}
      </div>
      <div className={`grid min-h-0 flex-1 ${GRID_COLS} grid-rows-4 gap-1 overflow-hidden`}>
        {Array.from({ length: WEEK_COUNT }, (_, row) => {
          const rowDays = days
            ? days.slice(row * 7, row * 7 + 7)
            : Array.from({ length: 7 }, () => null);
          const weekStart = rowDays[0];
          const weekKey = weekStart ? zonedDateKey(weekStart, timezone) : `pending-week-${row}`;
          const weekLabel = weekStart
            ? `Week of ${new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                timeZone: timezone,
              }).format(weekStart)}`
            : "Week";
          return [
            <button
              key={`${weekKey}-open`}
              type="button"
              disabled={weekStart === null}
              aria-label={weekLabel}
              onClick={() => {
                if (weekStart) {
                  onSelectWeek(weekKey);
                }
              }}
              className="flex h-full w-full items-center justify-center text-text-muted"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>,
            ...rowDays.map((day, column) => {
              const index = row * 7 + column;
              const previous = days && index > 0 ? (days[index - 1] ?? null) : null;
              const key = day ? zonedDateKey(day, timezone) : `pending-${row}-${column}`;
              const isToday = day !== null && key === todayKey;
              const chips = day && events ? eventsOnDay(events, day, timezone) : [];
              const crowded = chipCapacity !== null && chips.length > chipCapacity;
              const visibleCount = crowded ? Math.max(chipCapacity - 1, 0) : chips.length;
              const visibleChips = chips.slice(0, visibleCount);
              const moreCount = chips.length - visibleChips.length;
              const heading = day ? dayHeading(day, previous, timezone) : null;
              const weekend = day ? isWeekend(day, timezone) : false;
              const dateLabel = day
                ? new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    timeZone: timezone,
                  }).format(day)
                : "";
              return (
                <button
                  key={key}
                  type="button"
                  disabled={day === null}
                  aria-label={dateLabel || undefined}
                  onClick={() => {
                    if (day) {
                      onSelectDay(key);
                    }
                  }}
                  className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-md border border-border px-1.5 py-1 text-left font-[inherit] ${
                    isToday
                      ? "bg-white/8 ring-1 ring-today-ring ring-inset"
                      : weekend
                        ? "bg-black/40"
                        : "bg-bg-card"
                  }`}
                >
                  <span className="relative flex h-5 shrink-0 items-center">
                    <span
                      className={
                        isToday
                          ? "relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-today-ring px-1 text-xs font-medium text-white tabular-nums"
                          : "text-xs text-text-secondary tabular-nums"
                      }
                    >
                      {heading ? heading.day : ""}
                    </span>
                    {heading?.month ? (
                      <span className="pointer-events-none absolute inset-x-0 text-center text-[10px] tracking-wider text-text-muted">
                        {heading.month}
                      </span>
                    ) : null}
                  </span>
                  <div
                    ref={key === probeKey ? chipListRef : undefined}
                    className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden"
                  >
                    {visibleChips.map((event) => (
                      <div
                        key={event.id}
                        data-event-chip=""
                        className="truncate rounded-sm bg-white/5 py-0.5 pr-1 pl-1.5 text-xs leading-tight text-text-primary"
                        style={{ borderLeft: `3px solid ${event.calendarColor}` }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {moreCount > 0 ? (
                      <div className="truncate px-1 py-0.5 text-xs leading-tight text-text-muted">
                        +{moreCount} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            }),
          ];
        })}
      </div>
    </section>
  );
}
