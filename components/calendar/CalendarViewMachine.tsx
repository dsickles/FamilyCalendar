"use client";

import { useState } from "react";
import DayView from "@/components/calendar/DayView";
import FilterBar from "@/components/calendar/FilterBar";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import {
  calendarDateParts,
  getWeekBounds,
  getWindowStart,
  zonedDateTime,
  type TimeFormat,
  type WeekStartDay,
} from "@/lib/date-utils";
import { CalendarPreviewProvider } from "@/lib/hooks/useCalendar";
import type { CalendarViewState } from "@/lib/types/ui-state";

type CalendarViewMachineProps = {
  timezone: string;
  weekStartDay: WeekStartDay;
  timeFormat: TimeFormat;
  previewDemo?: boolean;
};

const initialState: CalendarViewState = {
  mode: "month",
  anchorDate: "",
  activeFilters: [],
  lastInteractionAt: 0,
};

function dateFromKey(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return zonedDateTime(year, month, day, 12, 0, 0, timeZone);
}

function toDateKey(date: Date, timeZone: string): string {
  const { year, month, day } = calendarDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekStartFor(dateKey: string, weekStartDay: WeekStartDay, timeZone: string): string {
  const start = getWeekBounds(dateFromKey(dateKey, timeZone), weekStartDay, timeZone).start;
  return toDateKey(start, timeZone);
}

function shiftKey(dateKey: string, days: number, timeZone: string): string {
  return toDateKey(getWindowStart(dateFromKey(dateKey, timeZone), days, timeZone), timeZone);
}

export default function CalendarViewMachine({
  timezone,
  weekStartDay,
  timeFormat,
  previewDemo = false,
}: CalendarViewMachineProps) {
  const [view, setView] = useState<CalendarViewState>(initialState);

  function setFilters(activeFilters: string[]) {
    setView((current) => ({
      ...current,
      activeFilters,
      lastInteractionAt: 0,
    }));
  }

  function showMonth() {
    setView((current) => ({
      ...current,
      mode: "month",
      lastInteractionAt: 0,
    }));
  }

  function showWeek() {
    setView((current) => ({
      ...current,
      mode: "week",
      anchorDate: current.selectedWeekStart ?? current.anchorDate,
      lastInteractionAt: 0,
    }));
  }

  function openWeek(weekStartKey: string) {
    setView((current) => ({
      mode: "week",
      anchorDate: weekStartKey,
      selectedDay: current.selectedDay,
      selectedWeekStart: weekStartKey,
      activeFilters: current.activeFilters,
      lastInteractionAt: 0,
    }));
  }

  function stepDay(delta: number) {
    setView((current) => {
      if (!current.selectedDay) {
        return current;
      }
      const next = shiftKey(current.selectedDay, delta, timezone);
      return {
        mode: "day",
        anchorDate: next,
        selectedDay: next,
        selectedWeekStart: weekStartFor(next, weekStartDay, timezone),
        activeFilters: current.activeFilters,
        lastInteractionAt: 0,
      };
    });
  }

  function stepWeek(delta: number) {
    setView((current) => {
      if (!current.selectedWeekStart) {
        return current;
      }
      const next = shiftKey(current.selectedWeekStart, delta * 7, timezone);
      return {
        ...current,
        mode: "week",
        anchorDate: next,
        selectedWeekStart: next,
        lastInteractionAt: 0,
      };
    });
  }

  function openDay(dateKey: string, recomputeWeek: boolean) {
    setView((current) => ({
      mode: "day",
      anchorDate: dateKey,
      selectedDay: dateKey,
      selectedWeekStart: recomputeWeek
        ? weekStartFor(dateKey, weekStartDay, timezone)
        : current.selectedWeekStart,
      activeFilters: current.activeFilters,
      lastInteractionAt: 0,
    }));
  }

  let calendar = (
    <MonthView
      timezone={timezone}
      weekStartDay={weekStartDay}
      activeFilters={view.activeFilters}
      onSelectDay={(dateKey) => openDay(dateKey, true)}
      onSelectWeek={openWeek}
    />
  );

  if (view.mode === "day" && view.selectedDay) {
    calendar = (
      <DayView
        timezone={timezone}
        timeFormat={timeFormat}
        weekStartDay={weekStartDay}
        selectedDay={view.selectedDay}
        activeFilters={view.activeFilters}
        onShowMonth={showMonth}
        onShowWeek={showWeek}
        onPreviousDay={() => stepDay(-1)}
        onNextDay={() => stepDay(1)}
      />
    );
  } else if (view.mode === "week" && view.selectedWeekStart) {
    calendar = (
      <WeekView
        timezone={timezone}
        timeFormat={timeFormat}
        weekStartDay={weekStartDay}
        selectedWeekStart={view.selectedWeekStart}
        activeFilters={view.activeFilters}
        onShowMonth={showMonth}
        onSelectDay={(dateKey) => openDay(dateKey, false)}
        onPreviousWeek={() => stepWeek(-1)}
        onNextWeek={() => stepWeek(1)}
      />
    );
  }

  return (
    <CalendarPreviewProvider enabled={previewDemo}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <FilterBar activeFilters={view.activeFilters} onChange={setFilters} />
        <div className="min-h-0 flex-1 overflow-hidden">{calendar}</div>
      </div>
    </CalendarPreviewProvider>
  );
}
