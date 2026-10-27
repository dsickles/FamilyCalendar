# Specification: Platform Baseline (carried forward)

**Feature ID**: `00-platform-baseline`
**Created**: 2026-10-27
**Status**: Implemented. Restates, as current requirements, the server platform that Phases 1 through 9.1 built for the iPad wall and that the Anna Bella wall keeps.
**Constitution check**: Principles III (PIN-gate, cookie, rate limit, server-only feed URLs, demo mode) and IV (timeouts, `Promise.allSettled`, bounded TTL caches, stale over blank, health, Docker)
**Project context**: `.spec/project.md`
**History**: The full iPad-era specs (`01-core-and-security.md` through `09.1-post-launch-polish.md`) and their task lists are in git history at `7acdc2c`. Where this file and those differ, this file wins.

This file is the contract later phases build on. It covers only what
survives the move to the frame: authentication, configuration, the calendar
and weather engines, caching, health, demo data, and Docker. The iPad shell,
the header widgets, the filter-chip layout, and the old `/` page are not
carried forward; Phase 10 replaces them. The month, week, and day view
components are carried forward only as parts of the Calendar tab, specified
in `10-frame-shell.md`.

## Requirements

### Authentication and session

- **BL-001**: The PIN-gate MUST inspect the `dash_session` cookie on every
  request except the skip list in the constitution (Principle III). Page
  routes without a valid cookie redirect to `/unlock`. API routes without a
  valid cookie return 401 and no private data.
- **BL-002**: `POST /api/auth/unlock` accepts `{ pin: string }`, compares it
  server-side with `DASHBOARD_PIN` via `verifyPin`, and on success sets
  `dash_session` (`httpOnly`, `sameSite: "strict"`, `path: "/"`, 30-day
  `maxAge`, `secure` in production). Helpers live in `lib/auth.ts`:
  `hashPin`, `verifyPin`, `createSessionCookie`, `verifySessionCookie`,
  `sessionCookieOptions`, `clearSessionCookieOptions`.
- **BL-003**: Failed unlocks are rate-limited to 5 per client IP per 15
  minutes in an in-process `Map` of `{ count, resetAt }`. The limit resets
  on restart. While limited, even the right PIN is refused.
- **BL-004**: `/unlock` shows a 3×4 touch PIN pad (0–9, backspace, submit)
  with ≥ 44×44 CSS px keys, an error shake on failure, and no PIN hints.
  On the frame it MUST fit 1920×1080 with no scroll.
- **BL-005**: `POST /api/auth/lock` expires only the caller's cookie, sits
  behind the PIN-gate, and keeps no revocation list. In demo mode it
  returns 200 and does nothing. The lock control (`LockControl`) asks
  "Lock dashboard? PIN will be required." with Cancel as the default.
  Idle timers MUST NEVER call it.
- **BL-006**: In demo mode (no `CAL_*_URL`), the PIN-gate lets every
  request through.

### Configuration and types

- **BL-007**: `lib/config.ts` exports `getCalendarSources()`,
  `getDashboardConfig()`, and `isDemoMode()`. `icsUrl` exists only on the
  server-side `CalendarSource`. Calendar sources come from
  `CAL_<ID>_URL`, `_LABEL`, `_COLOR`, `_CATEGORY`
  (`person | shared | utility | external`).
- **BL-008**: `DashboardConfig` defaults: lat `40.9892`, lon `-73.7944`,
  displayName `"Scarsdale, NY"`, timezone `America/New_York`, locale
  `en-US`, temperature `fahrenheit`, timeFormat `12h`, weekStartDay `0`,
  idleTimeoutMs `90000`, cacheRevalidateSeconds `600`.
- **BL-009**: Client-facing calendar types carry `calendarId`,
  `calendarLabel`, `calendarColor`, and `calendarCategory`, never a URL.
  `UnifiedEvent` is:

  ```typescript
  export interface UnifiedEvent {
    id: string; // `${calendarId}::${uid}::${occurrenceDate.toISOString()}`
    calendarId: string;
    calendarLabel: string;
    calendarColor: string;
    calendarCategory: CalendarSource["category"];
    title: string;
    description: string;
    location: string;
    startTime: string; // ISO 8601, dashboard timezone
    endTime: string;
    isAllDay: boolean;
    isRecurring: boolean;
    originalUid: string;
  }
  ```

- **BL-010**: `.env.example` documents every variable with empty secrets.
  `.gitignore` excludes `.env.local`, `.env.*.local`, `.next/`, `out/`,
  and `node_modules/`.

### Calendar engine

- **BL-011**: `GET /api/calendar` checks the cache, calls
  `fetchAndParseCalendars` on a miss, caches successful results, and
  returns `CalendarApiResponse`:

  ```typescript
  export interface CalendarApiResponse {
    events: UnifiedEvent[];
    fetchedAt: string;
    stale: boolean;
    cache: "hit" | "miss" | "stale";
    errors: Array<{
      calendarId: string;
      calendarLabel: string;
      reason: "timeout" | "network" | "parse" | "unknown";
    }>;
  }
  ```

  HTTP status is 200 for empty, partial, stale, and full results.
  `Cache-Control: s-maxage=<cacheRevalidateSeconds>, stale-while-revalidate=300`.
- **BL-012**: The fetch window is **−7 days to +45 days** from
  dashboard-local today, computed on the server. Clients cannot widen it.
- **BL-013**: Each feed is fetched with an 8-second `AbortController`
  timeout under `Promise.allSettled`, parsed with `node-ical` `parseICS`,
  and skipped on parse failure.
- **BL-014**: Recurring events expand with `rrule.between(windowStart,
  windowEnd)`. EXDATEs are removed (date-only compare for all-day, exact
  instant for timed). RECURRENCE-ID overrides replace their occurrence; an
  orphaned override is kept as its own event. `VALUE=DATE` events are
  all-day from local midnight to the next local midnight.
- **BL-015**: Times are normalized to the dashboard timezone with
  `Intl.DateTimeFormat` and an explicit `timeZone`, never raw offsets.
  Output is sorted by `startTime`.
- **BL-016**: `fixture:<basename>` feed URLs resolve only inside
  `lib/__fixtures__/`. `mock.ics` is the only committed ICS.
- **BL-017**: When every feed fails, the route serves the last-known events
  with `stale: true`, even past the TTL.
- **BL-018**: Demo mode returns `generateDemoEvents()` (about 25–30 events
  for Alex, Jordan, Family, and School, relative to today, deterministic
  within a day) and never fetches ICS.

### Weather engine

- **BL-019**: `GET /api/weather` builds a cache key from latitude,
  longitude, timezone, temperature unit, wind unit, and day count, then
  serves a fresh hit, fetches Open-Meteo on a miss (8-second timeout, no
  API key), and on failure serves the last-known `WeatherData` with
  `stale: true`, or `weather: null` when cold. TTL 1800 seconds.
  `Cache-Control: s-maxage=1800, stale-while-revalidate=600`.
- **BL-020**: The response is `WeatherApiResponse`
  (`{ weather, stale, cache, errors }`). `WeatherData` holds `current`
  (temperature, apparentTemperature, weatherCode, windSpeed, humidity,
  isDay), `daily[]` (date, temperatureMax, temperatureMin, weatherCode,
  precipitationProbability) for 7 days, and `fetchedAt`. Phase 10 adds an
  hourly series.
- **BL-021**: `describeWeatherCode(code)` in `lib/wmo-codes.ts` maps WMO
  codes to a label and a Lucide icon name; unknown codes are
  `Unknown` / `Cloud`.
- **BL-022**: Both engine routes answer HTML to a browser that prefers
  `text/html` and JSON otherwise.

### Caches, health, logging

- **BL-023**: Caches are process `Map`s held on `globalThis` (so dev
  reloads don't fork them), keyed by source identity plus window, with
  expired keys pruned on write and on fresh reads.
- **BL-024**: `GET /api/health` is unauthenticated and returns
  `{ status: "ok", mode: "live" | "demo", timestamp }`.
- **BL-025**: Logs MAY record one line per cache HIT, MISS, or STALE, with
  no URLs, PINs, or payloads.

### Docker

- **BL-026**: `next.config.ts` sets `output: "standalone"`. The
  `Dockerfile` is multi-stage (Node 20 Alpine builder and runner).
  `docker-compose.yml` maps `3000:3000`, uses `env_file: .env.local`,
  `restart: unless-stopped`, and a healthcheck on `/api/health` every 60
  seconds (timeout 5 seconds, 3 retries).

## Success Criteria

- **SC-001**: `npm test` passes the existing unit suites for auth, the
  calendar engine, the calendar cache, the weather engine, filters, and
  date utilities.
- **SC-002**: With a PIN and a fixture feed set, unauthenticated
  `/api/calendar` and `/api/weather` return 401 or redirect; `/unlock`
  and `/api/health` stay open.
- **SC-003**: A hung feed times out without stalling the other feeds
  (covered by the existing engine test).
- **SC-004**: The client bundle scan (`npm run check:secrets`) finds no
  PIN, ICS URL, or `icsUrl`.

## Out of Scope

- Anything visual. The wall's look and tabs are Phase 10 onward.
- New providers or feeds.

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| BL-001 to BL-006 | III (PIN-gate, cookie, rate limit, lock, demo) |
| BL-007 to BL-010 | III (server-only URLs, env-only secrets) |
| BL-011 to BL-018 | III (no URLs in payloads), IV (timeouts, allSettled, stale over blank) |
| BL-019 to BL-022 | IV (timeouts, stale over blank) |
| BL-023 to BL-026 | IV (bounded caches, health, Docker) |
