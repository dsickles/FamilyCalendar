import { readFile } from "node:fs/promises";
import path from "node:path";
import ical from "node-ical";
import type {
  DateWithTimeZone,
  EventInstance,
  VEvent,
} from "node-ical";
import type { CalendarSource } from "@/lib/config";
import { getDashboardConfig } from "@/lib/config";
import { zonedDateTime } from "@/lib/date-utils";
import type {
  CalendarFeedError,
  UnifiedEvent,
} from "@/lib/types/calendar";

const FEED_TIMEOUT_MS = 8_000;
const FIXTURE_NAME = /^[A-Za-z0-9._-]+\.ics$/;

export type CalendarEngineResult = {
  events: UnifiedEvent[];
  errors: CalendarFeedError[];
};

function logFeed(calendarId: string, reason: string): void {
  console.info(`calendar-feed ${calendarId} ${reason}`);
}

function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "val" in value &&
    typeof (value as { val: unknown }).val === "string"
  ) {
    return (value as { val: string }).val;
  }
  return "";
}

function isVEvent(value: unknown): value is VEvent {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      (value as { type: unknown }).type === "VEVENT",
  );
}

function classifyError(error: unknown): CalendarFeedError["reason"] {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "timeout";
    }
    if (error.name === "TypeError") {
      return "network";
    }
  }
  return "unknown";
}

function fixturePath(icsUrl: string): string | null {
  if (!icsUrl.startsWith("fixture:")) {
    return null;
  }
  const basename = icsUrl.slice("fixture:".length).trim();
  if (!FIXTURE_NAME.test(basename)) {
    return null;
  }
  return path.join(process.cwd(), "lib", "__fixtures__", basename);
}

async function readFeedText(icsUrl: string): Promise<string> {
  const local = fixturePath(icsUrl);
  if (local) {
    return readFile(local, "utf8");
  }
  if (!/^https?:\/\//i.test(icsUrl)) {
    throw Object.assign(new Error("unsupported feed scheme"), {
      name: "TypeError",
    });
  }
  const response = await fetch(icsUrl, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw Object.assign(new Error("feed http error"), { name: "TypeError" });
  }
  return response.text();
}

function dateOnlyYmd(date: Date): { year: number; month: number; day: number } {
  const withMeta = date as DateWithTimeZone;
  if (withMeta.dateOnly) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function addOneLocalDay(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const utc = Date.UTC(year, month - 1, day + 1);
  const next = new Date(utc);
  return zonedDateTime(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    0,
    timeZone,
  );
}

function normalizeOccurrence(
  start: Date,
  end: Date | undefined,
  isAllDay: boolean,
  isFloating: boolean,
  timeZone: string,
): { start: Date; end: Date } {
  if (isAllDay) {
    const startParts = dateOnlyYmd(start);
    const startLocal = zonedDateTime(
      startParts.year,
      startParts.month,
      startParts.day,
      0,
      0,
      0,
      timeZone,
    );
    if (end) {
      const endParts = dateOnlyYmd(end);
      const endLocal = zonedDateTime(
        endParts.year,
        endParts.month,
        endParts.day,
        0,
        0,
        0,
        timeZone,
      );
      if (endLocal.getTime() > startLocal.getTime()) {
        return { start: startLocal, end: endLocal };
      }
    }
    return {
      start: startLocal,
      end: addOneLocalDay(
        startParts.year,
        startParts.month,
        startParts.day,
        timeZone,
      ),
    };
  }

  if (isFloating) {
    const startLocal = zonedDateTime(
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
      start.getSeconds(),
      timeZone,
    );
    if (end) {
      const endLocal = zonedDateTime(
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
        end.getSeconds(),
        timeZone,
      );
      return { start: startLocal, end: endLocal };
    }
    return {
      start: startLocal,
      end: new Date(startLocal.getTime() + 60 * 60 * 1000),
    };
  }

  if (end) {
    return { start, end };
  }
  return { start, end: new Date(start.getTime() + 60 * 60 * 1000) };
}

function toUnified(
  source: CalendarSource,
  event: VEvent,
  occurrenceStart: Date,
  occurrenceEnd: Date,
  isAllDay: boolean,
  isRecurring: boolean,
): UnifiedEvent {
  return {
    id: `${source.id}::${event.uid}::${occurrenceStart.toISOString()}`,
    calendarId: source.id,
    calendarLabel: source.label,
    calendarColor: source.color,
    calendarCategory: source.category,
    title: textValue(event.summary),
    description: textValue(event.description),
    location: textValue(event.location),
    startTime: occurrenceStart.toISOString(),
    endTime: occurrenceEnd.toISOString(),
    isAllDay,
    isRecurring,
    originalUid: event.uid,
  };
}

function attachOverrides(events: VEvent[]): void {
  const masters = new Map<string, VEvent>();
  for (const event of events) {
    if (event.rrule && !event.recurrenceid) {
      masters.set(event.uid, event);
    }
  }
  for (const event of events) {
    if (!event.recurrenceid) {
      continue;
    }
    const master = masters.get(event.uid);
    if (!master) {
      continue;
    }
    master.recurrences = master.recurrences ?? {};
    const iso = event.recurrenceid.toISOString();
    master.recurrences[iso] = event;
    master.recurrences[iso.slice(0, 10)] = event;
  }
}

function inWindow(start: Date, windowStart: Date, windowEnd: Date): boolean {
  const time = start.getTime();
  return time >= windowStart.getTime() && time <= windowEnd.getTime();
}

async function parseFeed(
  source: CalendarSource,
  windowStart: Date,
  windowEnd: Date,
  timeZone: string,
): Promise<UnifiedEvent[]> {
  const text = await readFeedText(source.icsUrl);
  let events: VEvent[];
  try {
    const parsed = await ical.async.parseICS(text);
    events = Object.values(parsed).filter(isVEvent);
  } catch {
    throw Object.assign(new Error("parse failed"), { name: "ParseError" });
  }

  attachOverrides(events);
  const masters = new Set(
    events
      .filter((event) => event.rrule && !event.recurrenceid)
      .map((event) => event.uid),
  );
  const unified: UnifiedEvent[] = [];

  for (const event of events) {
    if (event.status === "CANCELLED") {
      continue;
    }
    if (event.recurrenceid && masters.has(event.uid)) {
      continue;
    }

    const isAllDay =
      event.datetype === "date" ||
      Boolean((event.start as DateWithTimeZone | undefined)?.dateOnly);
    const isFloating =
      !isAllDay && !(event.start as DateWithTimeZone | undefined)?.tz;

    let instances: EventInstance[];
    try {
      instances = ical.expandRecurringEvent(event, {
        from: windowStart,
        to: windowEnd,
        includeOverrides: true,
        excludeExdates: true,
      });
    } catch {
      continue;
    }

    for (const instance of instances) {
      const instanceAllDay = instance.isFullDay || isAllDay;
      const instanceFloating =
        !instanceAllDay &&
        !(instance.start as DateWithTimeZone).tz &&
        isFloating;
      const bounds = normalizeOccurrence(
        instance.start,
        instance.end,
        instanceAllDay,
        instanceFloating,
        timeZone,
      );
      if (!inWindow(bounds.start, windowStart, windowEnd)) {
        continue;
      }
      unified.push(
        toUnified(
          source,
          instance.event,
          bounds.start,
          bounds.end,
          instanceAllDay,
          instance.isRecurring ||
            Boolean(event.rrule) ||
            Boolean(event.recurrenceid),
        ),
      );
    }
  }

  return unified;
}

export async function fetchAndParseCalendars(
  sources: CalendarSource[],
  windowStart: Date,
  windowEnd: Date,
): Promise<CalendarEngineResult> {
  const timeZone = getDashboardConfig().timezone;
  const enabled = sources.filter((source) => source.enabled && source.icsUrl);
  const settled = await Promise.allSettled(
    enabled.map(async (source) => {
      try {
        const events = await parseFeed(
          source,
          windowStart,
          windowEnd,
          timeZone,
        );
        return { source, events };
      } catch (error) {
        const parseFailed =
          error instanceof Error && error.name === "ParseError";
        const reason: CalendarFeedError["reason"] = parseFailed
          ? "parse"
          : classifyError(error);
        logFeed(source.id, reason);
        throw { source, reason };
      }
    }),
  );

  const events: UnifiedEvent[] = [];
  const errors: CalendarFeedError[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      events.push(...result.value.events);
      continue;
    }
    const rejected = result.reason as {
      source?: CalendarSource;
      reason?: CalendarFeedError["reason"];
    };
    if (rejected?.source) {
      errors.push({
        calendarId: rejected.source.id,
        calendarLabel: rejected.source.label,
        reason: rejected.reason ?? "unknown",
      });
      continue;
    }
    errors.push({
      calendarId: "unknown",
      calendarLabel: "unknown",
      reason: "unknown",
    });
  }

  events.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return { events, errors };
}
