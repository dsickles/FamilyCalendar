# Specification: Weather Data Engine (Server-Side)

**Feature ID**: `03-weather-engine`
**Created**: 2026-09-21
**Status**: Implemented 2026-09-21. Human review next. Do not start Phase 4 in this thread.
**Input**: `.spec/project.md` phasing, `WeatherData` and weather env defaults in `.spec/specifications/01-core-and-security.md`, cache/API envelope pattern in `.spec/specifications/02-calendar-engine.md`
**Constitution check**: Principle II (PIN-gate already covers `/api/weather`; lat/lon are non-secret defaults; no API key; ICS URLs and PIN stay server-side) and Principle III (explicit 1800s TTL, bounded cache key, 8s fetch timeout, last-known data over a blank wall)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (`WeatherData`, `getDashboardConfig()`, PIN-gate, demo mode). Do not reopen PIN-gate or the calendar engine unless they are broken.

This specification covers only the server-side weather pipeline: a 30-minute in-memory cache, an Open-Meteo forecast fetch with no API key, a WMO code lookup, and `GET /api/weather` returning `WeatherData`. Layout, weather widgets, and SWR hooks are out of scope.

## User Scenarios & Testing

### User Story 1 — Wall gets current conditions and a daily forecast (Priority: P1)

An operator or a demo-mode clone requests `GET /api/weather`. The server calls Open-Meteo with the configured latitude and longitude (defaults: Scarsdale, NY `40.9892`, `-73.7944`), transforms the forecast into `WeatherData`, and returns current conditions plus a daily forecast. No weather API key exists.

**Why this priority**: Phase 3's product is a working weather payload. Demo mode must stay useful without secrets, and Open-Meteo is public.

**Independent Test**: `GET /api/weather` (JSON accept, or `curl`) returns 200. `weather.current` has temperature, apparent temperature, weather code, wind, humidity, and `isDay`. `weather.daily` has at least three entries with `YYYY-MM-DD` dates, high, low, weather code, and precipitation probability. The outbound URL has no API key.

**Acceptance Scenarios**:

1. **Given** dashboard config (env or defaults), **When** the engine fetches, **Then** it calls `https://api.open-meteo.com/v1/forecast` with `latitude` / `longitude` from `getDashboardConfig().location`, `timezone` from config, `temperature_unit` `fahrenheit` or `celsius` from config, `wind_speed_unit` `mph` when Fahrenheit and `kmh` when Celsius, `forecast_days=7`, and the current/daily variable lists in FR-006. It MUST NOT send an API key or any other credential.
2. **Given** a successful Open-Meteo body, **When** it is transformed, **Then** the result matches `WeatherData` exactly (no rewritten fields): current maps `temperature_2m`, `apparent_temperature`, `weather_code`, `wind_speed_10m`, `relative_humidity_2m`, and `is_day` (`1` → `true`, otherwise `false`); each daily row zips `time`, `temperature_2m_max`, `temperature_2m_min`, `weather_code`, and `precipitation_probability_max`. `fetchedAt` is an ISO 8601 timestamp set at successful transform and preserved on later cache hits.
3. **Given** demo mode (`isDemoMode() === true`, no `CAL_*_URL`), **When** a client requests `GET /api/weather` without a `dash_session` cookie, **Then** it succeeds and uses Open-Meteo with the default lat/lon. Demo mode MUST NOT skip the weather fetch and MUST NOT require a secret.
4. **Given** the JSON response, **When** it is searched, **Then** it contains no PIN, no `DASHBOARD_PIN`, and no ICS URL. Latitude and longitude are not added as new client-bundle secrets; they stay server config inputs. `WeatherData` itself does not gain a location field.

---

### User Story 2 — Open-Meteo being down does not blank the wall (Priority: P1)

The forecast host times out, returns a non-OK status, or returns a body that cannot be mapped. The appliance returns the last successful `WeatherData` even if the 30-minute TTL has expired. With no prior success, it still returns HTTP 200 and an empty weather slot plus an error reason.

**Why this priority**: Constitution III: last-known data beats a blank wall. One external host must not take the kiosk down.

**Independent Test**: Prime the cache with a successful GET. Then block or point the fetch at a failure. The next GET is 200 with `stale: true` and the previous `weather` object. A cold process with a failing host returns 200, `weather: null`, and one error reason within about 8 seconds.

**Acceptance Scenarios**:

1. **Given** an Open-Meteo request, **When** it is sent, **Then** it uses an 8-second `AbortController` timeout.
2. **Given** a timeout, network error, non-OK HTTP status, or a body that fails the `WeatherData` mapping (missing arrays, non-finite numbers), **When** a prior cache entry exists for the same key, **Then** that entry is returned with `stale: true` and `cache: "stale"` even if `expiresAt` is in the past.
3. **Given** the same failure and no cache entry, **When** `GET /api/weather` runs, **Then** the handler returns **200** with `weather: null` and a single error reason — not a 5xx.
4. **Given** error metadata, **When** it is serialized, **Then** `reason` is `timeout` | `network` | `parse` | `unknown`. Logs MAY record that reason and the cache state. Logs MUST NOT include the PIN, ICS URLs, or the full forecast payload.

---

### User Story 3 — Repeat requests within 30 minutes hit memory cache (Priority: P2)

The kiosk will poll this route. The server must not call Open-Meteo on every request. Weather TTL is **1800 seconds**, independent of `CACHE_REVALIDATE_SECONDS` (that value remains the calendar TTL, default 600).

**Why this priority**: Appliance runtime: bounded memory and a predictable load on a free weather host.

**Independent Test**: Two JSON GETs within 30 minutes. The second is `cache: "hit"` and does not call Open-Meteo again. `Cache-Control` is `s-maxage=1800, stale-while-revalidate=600`.

**Acceptance Scenarios**:

1. **Given** a populated cache whose `expiresAt` is in the future, **When** `GET /api/weather` runs, **Then** the engine is not invoked and the cached `WeatherData` is returned (`cache: "hit"`, `stale: false`). `fetchedAt` stays the original transform time.
2. **Given** a cache miss or expiry and a healthy fetch, **When** the engine completes, **Then** the `WeatherData` is stored for **1800 seconds**. The route MUST NOT use `cacheRevalidateSeconds` as the weather TTL.
3. **Given** cache keys, **When** they are constructed, **Then** they are a hash of location (latitude, longitude), timezone, temperature unit, wind unit, and `forecast_days`. The route MUST NOT accept client `lat` / `lon` / date query parameters (unbounded keys).
4. **Given** expired entries, **When** get/set runs, **Then** expired keys are dropped so the `Map` cannot grow without bound. A single process holds one map (same `globalThis` slot pattern as `lib/calendar-cache.ts`).

---

### User Story 4 — A browser can read the forecast without a JSON viewer (Priority: P1)

Opening `/api/weather` in a browser is the human review path. The page states current conditions and at least three forecast days in dark text on a light background. `curl` and later SWR clients still receive JSON.

**Why this priority**: A white-on-white dump of JSON is not a reviewable result. Phase 3 still must not build the wall widget.

**Independent Test**: A browser-like `Accept: text/html` GET returns `text/html` with a light page, the location display name, current temperature and condition label, and at least three daily rows. A request that does not prefer `text/html` (curl's `*/*`) returns `application/json`.

**Acceptance Scenarios**:

1. **Given** `Accept` contains `text/html` and either omits `application/json` or lists `text/html` first, **When** `GET /api/weather` succeeds or serves stale data, **Then** the response is `Content-Type: text/html; charset=utf-8` with `color-scheme: light`, a light background (`#f4f4f5` or equivalent), and dark text (`#111827` or equivalent). It shows `location.displayName`, current temperature with unit, apparent temperature, humidity, wind, the WMO label, and at least three daily rows (date, high, low, precipitation probability, WMO label).
2. **Given** any other `Accept` (including `*/*` and `application/json`), **When** the same route runs, **Then** the body is the JSON envelope in FR-010. Status and `Cache-Control` match the HTML response.
3. **Given** the HTML page, **When** it is reviewed, **Then** it is not a page whose only content is a `<pre>` of JSON, and text color is not the same as the background.

---

### User Story 5 — Weather codes become a label and a Lucide icon name (Priority: P2)

Open-Meteo sends WMO codes. The server maps each code from 0 through 99 to a short English label and a Lucide icon **name** (string). Phase 4 will render the icon; this phase only provides the lookup and uses the label on the HTML review page.

**Why this priority**: The wall cannot show a raw `weatherCode` integer as the condition. The mapping must exist before any widget.

**Independent Test**: `describeWeatherCode(0)` is Clear / `Sun`. `describeWeatherCode(61)` is rain / `CloudRain`. `describeWeatherCode(95)` is thunderstorm / `CloudLightning`. An unlisted integer in 0–99 is `Unknown` / `Cloud`. The HTML page uses these labels.

**Acceptance Scenarios**:

1. **Given** `lib/wmo-codes.ts`, **When** `describeWeatherCode(code)` is called, **Then** it returns `{ label: string; icon: string }` using the table in FR-008. `icon` is the Lucide component name, not an SVG and not a React element.
2. **Given** a code outside that table, including any other integer from 0 to 99 and any non-integer, **When** it is described, **Then** the result is `{ label: "Unknown", icon: "Cloud" }`.
3. **Given** this module, **When** it is imported, **Then** it has no server-only imports (`node:crypto`, `lib/config`, fetch). Client widgets in a later phase may import it.

---

### Edge Cases

- **PIN-gate**: Already implemented. Live unauthenticated `GET /api/weather` stays denied (401 or document redirect). This spec MUST NOT add `/api/weather` to the middleware skip list and MUST NOT retune unlock, lock, or rate-limit. Demo mode already skips the gate; weather still fetches Open-Meteo.
- **Calendar engine**: Do not change `/api/calendar`, `lib/calendar-*`, or ICS parsing unless a Phase 3 edit regresses them.
- **Units**: Fahrenheit + mph is the default (Scarsdale). Celsius uses km/h. Do not convert again after Open-Meteo returns numbers.
- **Daily length**: Request 7 days. Verification requires **at least 3** daily rows (today and the next two in the dashboard timezone). Extra days stay in the payload for a later widget. Do not truncate to 3.
- **Date of `daily[0]`**: Open-Meteo's `daily.time` in the requested `timezone` is the source of `YYYY-MM-DD`. Do not shift those strings with UTC date math.
- **Non-finite or missing fields**: Treat as `parse`, not as a partial `WeatherData` with holes.
- **HTML escaping**: Display name and labels interpolated into HTML MUST be escaped.
- **Widgets**: No `WeatherWidget`, no layout shell, no SWR hook in this phase.
- **Secrets**: Weather has no secret. Do not read `DASHBOARD_PIN` or `CAL_*_URL` inside the weather modules.

## Requirements

### Functional Requirements — Cache

- **FR-001**: `lib/weather-cache.ts` MUST follow the `lib/calendar-cache.ts` pattern: one process `Map` (including the `globalThis` slot so dev reload does not fork maps), TTL `get` / `set` / `invalidate`, fresh `get` returning `null` when missing or expired, and a stale read that returns last-known data after expiry. Expired keys MUST be pruned on write and on fresh-hit reads.
- **FR-002**: Stored value is `WeatherData`. Default TTL passed by the route is **1800** seconds. If a non-positive TTL is passed, fall back to 1800, not to `cacheRevalidateSeconds`.
- **FR-003**: `buildWeatherCacheKey` MUST hash latitude, longitude, timezone, temperature unit, wind-speed unit, and forecast day count. It MUST NOT hash raw request URLs.

### Functional Requirements — WMO codes

- **FR-004**: `lib/wmo-codes.ts` MUST export `describeWeatherCode(code: number): { label: string; icon: string }` with the labels and icon names in FR-008. Unknown codes use `Unknown` / `Cloud`.

### Functional Requirements — Engine

- **FR-005**: `lib/weather-engine.ts` MUST export a server-only function that fetches Open-Meteo and returns either `{ weather: WeatherData }` or `{ weather: null, reason }` as in User Story 2. It MUST use an 8-second timeout.
- **FR-006**: Query parameters MUST be:

  | Parameter | Value |
  |-----------|--------|
  | `latitude`, `longitude` | `getDashboardConfig().location` |
  | `current` | `temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day` |
  | `daily` | `weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` |
  | `temperature_unit` | `fahrenheit` or `celsius` |
  | `wind_speed_unit` | `mph` if Fahrenheit, otherwise `kmh` |
  | `timezone` | `getDashboardConfig().timezone` |
  | `forecast_days` | `7` |

  No API key parameter.
- **FR-007**: Mapping MUST produce the existing `WeatherData` interface unchanged. Numbers stay numbers. `daily[].date` is the Open-Meteo `time` string. `fetchedAt` is `new Date().toISOString()` at success.

### Functional Requirements — WMO table

- **FR-008**: Binding map (Open-Meteo WMO). Icon names are Lucide exports already in this repo:

  | Codes | Label | Icon |
  |-------|--------|------|
  | 0 | Clear sky | `Sun` |
  | 1 | Mainly clear | `Sun` |
  | 2 | Partly cloudy | `CloudSun` |
  | 3 | Overcast | `Cloud` |
  | 45 | Fog | `CloudFog` |
  | 48 | Depositing rime fog | `CloudFog` |
  | 51, 53, 55 | Drizzle | `CloudDrizzle` |
  | 56, 57 | Freezing drizzle | `CloudDrizzle` |
  | 61, 63, 65 | Rain | `CloudRain` |
  | 66, 67 | Freezing rain | `CloudRain` |
  | 80, 81, 82 | Rain showers | `CloudRain` |
  | 71, 73, 75 | Snow | `CloudSnow` |
  | 77 | Snow grains | `CloudSnow` |
  | 85, 86 | Snow showers | `CloudSnow` |
  | 95 | Thunderstorm | `CloudLightning` |
  | 96, 99 | Thunderstorm with hail | `CloudLightning` |
  | any other | Unknown | `Cloud` |

  Day versus night icon swaps are Phase 4. This table is code-only. `isDay` stays on `WeatherData.current`.

### Functional Requirements — API route

- **FR-009**: `app/api/weather/route.ts` `GET` MUST: build the cache key from config → fresh hit returns cached `WeatherData` → miss calls the engine → success `set`s the cache → total failure serves stale last-known or `weather: null`. Demo and live use the same fetch path. Demo does not require a cookie (existing middleware). Live stays PIN-gated without edits to `middleware.ts`.
- **FR-010**: Add this envelope next to `WeatherData` in `lib/types/weather.ts` (one canonical copy). Do not change the `WeatherData` fields from Phase 1.

  ```typescript
  export interface WeatherApiResponse {
    weather: WeatherData | null;
    stale: boolean;
    cache: "hit" | "miss" | "stale";
    errors: Array<{
      reason: "timeout" | "network" | "parse" | "unknown";
    }>;
  }
  ```

  HTTP status is **200** for success, stale, and total failure.
- **FR-011**: Both HTML and JSON responses MUST send `Cache-Control: s-maxage=1800, stale-while-revalidate=600`.
- **FR-012**: Content negotiation MUST match the calendar route rule: prefer HTML only when `Accept` includes `text/html` and `text/html` appears before `application/json` (or JSON is absent). HTML MUST satisfy User Story 4. JSON clients receive `WeatherApiResponse`.
- **FR-013**: A single log line MAY record `weather-cache HIT|MISS|STALE`. No forecast body, PIN, or ICS URL.

### Key Entities / Data Contracts

`WeatherData` is already binding in `01-core-and-security.md` and `lib/types/weather.ts`. Phase 3 adds `WeatherApiResponse` only.

| Open-Meteo | WeatherData |
|------------|-------------|
| `current.temperature_2m` | `current.temperature` |
| `current.apparent_temperature` | `current.apparentTemperature` |
| `current.weather_code` | `current.weatherCode` |
| `current.wind_speed_10m` | `current.windSpeed` |
| `current.relative_humidity_2m` | `current.humidity` |
| `current.is_day` | `current.isDay` |
| `daily.time[]` | `daily[].date` |
| `daily.temperature_2m_max[]` | `daily[].temperatureMax` |
| `daily.temperature_2m_min[]` | `daily[].temperatureMin` |
| `daily.weather_code[]` | `daily[].weatherCode` |
| `daily.precipitation_probability_max[]` | `daily[].precipitationProbability` |
| server clock at success | `fetchedAt` |

`describeWeatherCode` is not stored on `WeatherData`. The HTML review page and later widgets call it with `weatherCode`.

### Weather pipeline

```text
GET /api/weather
  Accept prefers text/html? → HTML review page (same status and cache headers)
  else → JSON WeatherApiResponse
  cache fresh? → cached WeatherData (cache: hit)
  miss → Open-Meteo (8s, no API key) → map to WeatherData
        → set cache 1800s
        → 200
  fetch failed + last-known? → stale: true (even if TTL expired)
  fetch failed + no cache? → 200 { weather: null, errors: [...] }
```

PIN-gate and the calendar engine stay unchanged. Demo mode may call Open-Meteo with default lat/lon.

## Success Criteria

- **SC-001**: `GET /api/weather` returns current conditions and at least a 3-day daily forecast in `weather` (JSON), from Open-Meteo, with no API key.
- **SC-002**: Demo mode (no `CAL_*_URL`) returns that payload without a session cookie. Live mode still denies unauthenticated calls via the existing PIN-gate.
- **SC-003**: A second request within 30 minutes is served from memory (`cache: "hit"`) and does not call Open-Meteo again.
- **SC-004**: Response `Cache-Control` is `s-maxage=1800, stale-while-revalidate=600`.
- **SC-005**: After a successful fetch, a failed Open-Meteo call still returns the previous `WeatherData` with `stale: true`. A cold failure is HTTP 200 with `weather: null`.
- **SC-006**: A browser GET shows current conditions and at least three forecast days in dark text on a light background. `curl` receives JSON.
- **SC-007**: Known WMO codes used above map to the labels and Lucide names in FR-008. The JSON payload and client bundles contain no PIN and no ICS URL.

## Assumptions

- Open-Meteo `https://api.open-meteo.com/v1/forecast` stays keyless. Verification needs outbound HTTPS to that host.
- `WeatherData`, `getDashboardConfig()`, `isDemoMode()`, and the PIN-gate already match Phase 1 / 1.5. Weather TTL is a constant 1800s, not `CACHE_REVALIDATE_SECONDS`.
- Default location remains Scarsdale (`40.9892`, `-73.7944`, display name `Scarsdale, NY`), timezone `America/New_York`, temperature Fahrenheit.
- QNAP is a single Node process; dropping the memory cache on restart is acceptable.
- Phase 4 will render Lucide icons from the `icon` string. This phase does not mount a widget.
- `daily[0]` is "today" in the requested timezone as Open-Meteo defines it. The 3-day check is `daily.length >= 3` plus well-formed dates, highs, lows, codes, and precipitation probabilities.

## Out of Scope (this specification)

- Dashboard layout, `WeatherWidget`, clock widget, filter bar (Phase 4+)
- SWR / `useWeather` client hook
- Month, week, and day calendar views
- PIN-gate, unlock, relock, rate-limit
- Calendar engine, ICS fetch, `/api/calendar`
- Geocoding, location search, or client-supplied coordinates
- A weather API key, paid weather vendor, or historical weather
- Day/night icon variants beyond the code table (Phase 4 may use `isDay`)

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | No kiosk UI in this phase. The review HTML is a normal document for a desktop browser, not the 1180×820 shell |
| II Privacy | `/api/weather` stays behind the existing PIN-gate; demo mode may call Open-Meteo with non-secret default lat/lon; no API key; ICS URLs and PIN never enter weather modules or the payload |
| III Appliance | 1800s TTL, pruned `Map`, key from location + units + window, 8s timeout, stale cache over an empty forecast, no payload logs |
