import { NextResponse } from "next/server";
import {
  buildCalendarCacheKey,
  getCalendarCache,
  getStaleCalendarCache,
  setCalendarCache,
} from "@/lib/calendar-cache";
import { fetchAndParseCalendars } from "@/lib/calendar-engine";
import {
  getCalendarSources,
  getDashboardConfig,
  isDemoMode,
} from "@/lib/config";
import {
  CALENDAR_WINDOW_FUTURE_DAYS,
  CALENDAR_WINDOW_PAST_DAYS,
  getWindowEnd,
  getWindowStart,
} from "@/lib/date-utils";
import { generateDemoEvents } from "@/lib/demo-data";
import type { CalendarApiResponse } from "@/lib/types/calendar";

function logCache(state: CalendarApiResponse["cache"]): void {
  console.info(`calendar-cache ${state.toUpperCase()}`);
}

function cacheHeaders(sMaxAge: number): HeadersInit {
  return {
    "Cache-Control": `s-maxage=${sMaxAge}, stale-while-revalidate=300`,
  };
}

function wantsBrowserHtml(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    return false;
  }
  const htmlAt = accept.indexOf("text/html");
  const jsonAt = accept.indexOf("application/json");
  return jsonAt === -1 || htmlAt < jsonAt;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function jsonResponse(body: CalendarApiResponse, sMaxAge: number): NextResponse {
  return NextResponse.json(body, {
    status: 200,
    headers: cacheHeaders(sMaxAge),
  });
}

function htmlResponse(body: CalendarApiResponse, sMaxAge: number): NextResponse {
  const pretty = escapeHtml(JSON.stringify(body, null, 2));
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Calendar API</title>
  <style>
    html, body {
      margin: 0;
      background: #f4f4f5;
      color: #111827;
      font: 14px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    main { padding: 24px; }
    h1 { font: 600 16px/1.3 system-ui, sans-serif; margin: 0 0 8px; }
    p { font: 14px/1.4 system-ui, sans-serif; color: #374151; margin: 0 0 16px; }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      background: #ffffff;
      color: #111827;
      border: 1px solid #d4d4d8;
      border-radius: 8px;
      padding: 16px;
    }
  </style>
</head>
<body>
  <main>
    <h1>GET /api/calendar</h1>
    <p>${body.events.length} events · cache ${escapeHtml(body.cache)}${body.stale ? " · stale" : ""} · ${body.errors.length} feed errors</p>
    <pre>${pretty}</pre>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      ...cacheHeaders(sMaxAge),
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function respond(request: Request, body: CalendarApiResponse, sMaxAge: number) {
  return wantsBrowserHtml(request)
    ? htmlResponse(body, sMaxAge)
    : jsonResponse(body, sMaxAge);
}

export async function GET(request: Request) {
  const config = getDashboardConfig();
  const ttl = config.cacheRevalidateSeconds || 600;
  const fetchedAt = new Date().toISOString();

  if (isDemoMode()) {
    const body: CalendarApiResponse = {
      events: generateDemoEvents(),
      fetchedAt,
      stale: false,
      cache: "miss",
      errors: [],
    };
    return respond(request, body, ttl);
  }

  const sources = getCalendarSources().filter(
    (source) => source.enabled && source.icsUrl,
  );
  const now = new Date();
  const windowStart = getWindowStart(
    now,
    -CALENDAR_WINDOW_PAST_DAYS,
    config.timezone,
  );
  const windowEnd = getWindowEnd(
    now,
    CALENDAR_WINDOW_FUTURE_DAYS,
    config.timezone,
  );
  const cacheKey = buildCalendarCacheKey(sources, windowStart, windowEnd);

  const fresh = getCalendarCache(cacheKey);
  if (fresh) {
    logCache("hit");
    return respond(
      request,
      {
        events: fresh,
        fetchedAt,
        stale: false,
        cache: "hit",
        errors: [],
      },
      ttl,
    );
  }

  const result = await fetchAndParseCalendars(sources, windowStart, windowEnd);
  const allFailed =
    sources.length > 0 &&
    result.events.length === 0 &&
    result.errors.length >= sources.length;

  if (allFailed) {
    const stale = getStaleCalendarCache(cacheKey);
    if (stale) {
      logCache("stale");
      return respond(
        request,
        {
          events: stale,
          fetchedAt,
          stale: true,
          cache: "stale",
          errors: result.errors,
        },
        ttl,
      );
    }
    logCache("miss");
    return respond(
      request,
      {
        events: [],
        fetchedAt,
        stale: false,
        cache: "miss",
        errors: result.errors,
      },
      ttl,
    );
  }

  setCalendarCache(cacheKey, result.events, ttl);
  logCache("miss");
  return respond(
    request,
    {
      events: result.events,
      fetchedAt,
      stale: false,
      cache: "miss",
      errors: result.errors,
    },
    ttl,
  );
}
