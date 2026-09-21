export const DEFAULT_TIMEZONE = "America/New_York";
export const CALENDAR_WINDOW_PAST_DAYS = 7;
export const CALENDAR_WINDOW_FUTURE_DAYS = 45;

export type TimeFormat = "12h" | "24h";
export type WeekStartDay = 0 | 1;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  offsetDays: number,
): { year: number; month: number; day: number } {
  const utc = Date.UTC(year, month - 1, day + offsetDays);
  const shifted = new Date(utc);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function zonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const asZone = zonedParts(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(
    asZone.year,
    asZone.month - 1,
    asZone.day,
    asZone.hour,
    asZone.minute,
    asZone.second,
  );
  return new Date(utcGuess - (asUtc - utcGuess));
}

export function getWindowStart(
  today: Date,
  offsetDays: number,
  timeZone = DEFAULT_TIMEZONE,
): Date {
  const parts = zonedParts(today, timeZone);
  const shifted = addCalendarDays(parts.year, parts.month, parts.day, offsetDays);
  return zonedDateTime(shifted.year, shifted.month, shifted.day, 0, 0, 0, timeZone);
}

export function getWindowEnd(
  today: Date,
  offsetDays: number,
  timeZone = DEFAULT_TIMEZONE,
): Date {
  const parts = zonedParts(today, timeZone);
  const nextDay = addCalendarDays(
    parts.year,
    parts.month,
    parts.day,
    offsetDays + 1,
  );
  return new Date(
    zonedDateTime(nextDay.year, nextDay.month, nextDay.day, 0, 0, 0, timeZone).getTime() -
      1,
  );
}

export function getDayBounds(
  date: Date,
  timeZone = DEFAULT_TIMEZONE,
): { start: Date; end: Date } {
  return {
    start: getWindowStart(date, 0, timeZone),
    end: getWindowEnd(date, 0, timeZone),
  };
}

export function getWeekBounds(
  date: Date,
  weekStartDay: WeekStartDay,
  timeZone = DEFAULT_TIMEZONE,
): { start: Date; end: Date } {
  const parts = zonedParts(date, timeZone);
  const utcNoon = Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  const weekday = new Date(utcNoon).getUTCDay();
  const delta = (weekday - weekStartDay + 7) % 7;
  const start = getWindowStart(date, -delta, timeZone);
  const end = getWindowEnd(date, 6 - delta, timeZone);
  return { start, end };
}

export function getWeeksInRange(
  start: Date,
  end: Date,
  weekStartDay: WeekStartDay = 0,
  timeZone = DEFAULT_TIMEZONE,
): Date[] {
  const weeks: Date[] = [];
  let cursor = getWeekBounds(start, weekStartDay, timeZone).start;
  const last = end.getTime();
  while (cursor.getTime() <= last) {
    weeks.push(cursor);
    cursor = getWindowStart(cursor, 7, timeZone);
  }
  return weeks;
}

export function formatTime(
  date: Date,
  format: TimeFormat,
  timeZone = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: format === "12h",
  }).format(date);
}

export function isSameDay(
  a: Date,
  b: Date,
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  const left = zonedParts(a, timeZone);
  const right = zonedParts(b, timeZone);
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

export function calendarDateParts(
  date: Date,
  timeZone = DEFAULT_TIMEZONE,
): { year: number; month: number; day: number } {
  const parts = zonedParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}
