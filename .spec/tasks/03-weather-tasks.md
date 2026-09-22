# Tasks: Weather Data Engine (Server-Side)

**Input**: `.spec/specifications/03-weather-engine.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 3, `WeatherData` in `01-core-and-security.md`, cache/envelope pattern in `02-calendar-engine.md`
**Status**: Implemented 2026-09-21. T027–T031 complete. Human review next. Do not start Phase 4 until a new chat explicitly asks for it.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before Phase 4.

**Organization**: One implementation slice (Phase 3). PIN-gate, calendar
engine, `WeatherData`, and `getDashboardConfig()` already exist — do not
revisit them unless they are broken.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US5]**: Maps to user stories in the specification
- Step IDs (`3.1` … `3.5`) are this phase's plan steps
- Task IDs continue from Phase 2 (`T026`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). Weather cache
and weather engine are **server-only**. `lib/wmo-codes.ts` is a pure
module and MUST NOT import server-only code. Do not import the cache or
engine from Client Components.

**Do not start Phase 4 (layout / widgets) in the same chat as this implementation.**

---

## Phase 3: Weather Data Engine

**Purpose**: Working `GET /api/weather` that returns `WeatherData` inside
`WeatherApiResponse` from Open-Meteo (no API key), with a 30-minute memory
cache and a readable browser page.

**Goal**: Working `/api/weather` endpoint that returns `WeatherData`
(current conditions + daily forecast).

- [x] T027 [P] [US3] Step 3.1 — Implement weather cache in
      `lib/weather-cache.ts`, same pattern as `lib/calendar-cache.ts`:
      one process `Map` via a `globalThis` slot,
      `Map<string, { data: WeatherData; expiresAt: number }>`,
      `buildWeatherCacheKey`, `getWeatherCache`, `getStaleWeatherCache`,
      `setWeatherCache`, `invalidateWeatherCache`. Key = hash of latitude,
      longitude, timezone, temperature unit, wind unit, and forecast day
      count — not request query strings. Fresh `get` returns data only
      before `expiresAt`; stale read returns last-known data after expiry;
      prune expired keys on set and on fresh get. TTL argument default
      **1800** seconds (fallback 1800 if the caller passes a non-positive
      number). MUST NOT read `cacheRevalidateSeconds`. File:
      `lib/weather-cache.ts`.
- [x] T028 [P] [US5] Step 3.2 — Implement WMO lookup in `lib/wmo-codes.ts`:
      `describeWeatherCode(code: number): { label: string; icon: string }`
      for the FR-008 table (codes 0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57,
      61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99).
      Any other value, including other integers 0–99, returns
      `{ label: "Unknown", icon: "Cloud" }`. Icon values are Lucide names
      (`Sun`, `CloudSun`, `Cloud`, `CloudFog`, `CloudDrizzle`, `CloudRain`,
      `CloudSnow`, `CloudLightning`) — strings only, no React import.
      No `lib/config` or Node built-in imports. File: `lib/wmo-codes.ts`.
- [x] T029 [P] [US1] [US2] Step 3.3 — Implement the Open-Meteo engine in
      `lib/weather-engine.ts`. Fetch
      `https://api.open-meteo.com/v1/forecast` with the FR-006 query
      (current + daily variables, `forecast_days=7`, units and timezone
      from `getDashboardConfig()`, no API key) and an 8-second
      `AbortController`. Map a successful body onto the existing
      `WeatherData` fields (see the spec table). `is_day === 1` →
      `isDay: true`. `fetchedAt` = ISO timestamp at success. Non-OK HTTP,
      timeout, network failure, or non-finite/missing fields return
      `{ weather: null, reason }` where `reason` is `timeout` | `network` |
      `parse` | `unknown`. Do not log the payload or the PIN. File:
      `lib/weather-engine.ts`.
- [x] T030 [US1] [US2] [US3] [US4] Step 3.4 — Implement
      `app/api/weather/route.ts` `GET` and add `WeatherApiResponse` to
      `lib/types/weather.ts` (do not change `WeatherData` fields). Flow:
      cache key from config → fresh hit `cache: "hit"` → miss calls the
      engine → success `setWeatherCache` for 1800s and `cache: "miss"` →
      failure with last-known `stale: true`, `cache: "stale"` → failure
      with no cache returns 200 `{ weather: null, stale: false, cache: "miss", errors: [{ reason }] }`.
      Demo and live share this path (demo already bypasses PIN in
      middleware; do **not** edit `middleware.ts` or auth routes). Header
      on every response:
      `Cache-Control: s-maxage=1800, stale-while-revalidate=600`.
      Negotiate like `app/api/calendar/route.ts`: HTML only when `Accept`
      prefers `text/html`. HTML is a light page (`color-scheme: light`,
      background `#f4f4f5`, text `#111827`) showing display name, current
      temperature with °F/°C, apparent temperature, humidity, wind, WMO
      label from `describeWeatherCode`, and at least three daily rows
      (date, high, low, precipitation probability, label). Escape
      interpolated text. Do not ship a white-on-white page or a JSON
      `<pre>` as the only review content. JSON clients get
      `WeatherApiResponse`. Optional one-line `weather-cache HIT|MISS|STALE`
      log. Files: `app/api/weather/route.ts`, `lib/types/weather.ts`.
- [x] T031 [US1] [US2] [US3] [US4] [US5] Step 3.5 — Verification only (no
      new product files): exercise `GET /api/weather` per the gate below.
      Confirm current conditions, `daily.length >= 3`, cache hit on the
      second call, HTML contrast for a browser `Accept`, JSON for curl,
      and the secret gate (no PIN, no ICS URL, no API key). Windows-friendly:
      `curl.exe`. Needs HTTPS to `api.open-meteo.com`.

### Phase 3 Verification

`GET /api/weather` returns JSON whose `weather` object is `WeatherData`
with current conditions and at least a 3-day forecast. A browser GET is
readable. The second request within 30 minutes hits cache.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Demo API | No `CAL_*_URL` → `GET /api/weather` is 200 without a cookie; `weather.current` has temperature, apparentTemperature, weatherCode, windSpeed, humidity, isDay; `weather.daily.length >= 3`; each day has `YYYY-MM-DD`, high, low, weatherCode, precipitationProbability |
| Live gating | PIN + any `CAL_*_URL` → unauthenticated GET is denied by existing middleware (do not edit the skip list unless this regresses) |
| No API key | Outbound forecast URL has no key query parameter; response has no PIN and no ICS URL |
| Envelope | Body is `WeatherApiResponse`; `WeatherData` field names unchanged from `lib/types/weather.ts` |
| Units | Default config yields Fahrenheit temperatures (Open-Meteo `temperature_unit=fahrenheit`) and mph wind |
| Cache hit | Second GET within 30 minutes does not call Open-Meteo again; `cache: "hit"` or log `weather-cache HIT` |
| Cache TTL | `Cache-Control` is `s-maxage=1800, stale-while-revalidate=600` (not the calendar 600s value) |
| Stale serve | After a successful fetch, a failed Open-Meteo call → 200 with prior `weather` and `stale: true` |
| Cold failure | No cache + failed fetch → 200, `weather: null`, one `errors[].reason`, within the 8s timeout budget |
| Browser page | `Accept: text/html` → HTML, light background, dark text, display name, current conditions, ≥ 3 daily rows with WMO labels |
| curl JSON | `curl` without an HTML Accept → `application/json` |
| WMO | `describeWeatherCode(0\|2\|3\|45\|51\|61\|71\|80\|85\|95)` matches FR-008; unknown code → Unknown / Cloud |
| Untouched | `middleware.ts` skip list unchanged; calendar route and calendar cache unchanged |

**Do not start Phase 4 (layout / widgets) until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phase 1 / 1.5 and Phase 2 complete (`WeatherData`, config defaults, PIN-gate, calendar engine left as-is).
- **T027, T028, T029**: Parallel (different files).
- **T030**: Depends on T027, T028, and T029.
- **T031**: Depends on T030.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Open-Meteo → WeatherData | T029, T030 | T030 with network |
| US2 Partial / stale | T029, T030 | T030 after a primed cache, then a failed fetch |
| US3 30 min cache | T027, T030 | Two GETs within 1800s |
| US4 Readable browser GET | T028, T030 | T030 with `Accept: text/html` |
| US5 WMO labels | T028, T030 | T028 unit check; labels visible on the HTML page |

### Parallel Opportunities

```text
After spec approval + "implement Phase 3":
  T027, T028, T029 in parallel
  then T030 (route + WeatherApiResponse)
  then T031 (verification gate)
```

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/03-weather-engine.md`.
2. Execute T027–T031 only after the explicit instruction
   **implement Phase 3**.
3. Run Phase 3 Verification → stop if any check fails.
4. Stop. Do not implement layout, weather widgets, or SWR hooks.

### MVP increment for this feature

US1 (JSON `GET /api/weather` with current + ≥ 3 daily rows) plus US4
(readable HTML) is the smallest demonstrable slice. US2, US3, and US5
are required before calling the weather engine complete.

---

## Notes

- Weather TTL is 1800 seconds. `CACHE_REVALIDATE_SECONDS` stays the
  calendar cache (default 600) and MUST NOT drive `/api/weather`.
- Demo mode calls Open-Meteo with default lat/lon. It does not use a
  fixture and does not require a secret.
- Do not revisit PIN-gate or the calendar engine unless a Phase 3 change
  regresses them.
- Browser review MUST be a light, high-contrast conditions page. Do not
  ship a white-on-white JSON viewer.
