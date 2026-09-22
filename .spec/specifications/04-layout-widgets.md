# Specification: Base Layout and Ambient Widgets

**Feature ID**: `04-layout-widgets`
**Created**: 2026-09-22
**Status**: Implemented 2026-09-22. T032–T035 complete. Human review next. Do not start Phase 5 in this thread.
**Input**: `.spec/project.md` Phase 4 ("Base layout and ambient widgets") and the runtime shape (`DashboardPage` → clock and weather on the PWA shell). `.spec/project.md` still lists Phase 3 as deferred; Phase 3 is implemented (T027–T031). Trust `.spec/specifications/03-weather-engine.md` and `.spec/tasks/03-weather-tasks.md`.
**Constitution check**: Principle I (1180×820 bound, zero document scroll, 44×44pt targets, scale to 1366×1024 and 1920×1080), Principle II (no PIN, ICS URL, or lat/lon added to the client), Principle III (clock is `requestAnimationFrame`, re-render only when the displayed minute changes, SWR cleans up on unmount, last-known weather over a blank header)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (kiosk CSS, viewport meta, `LockControl`, `getDashboardConfig()`, `WeatherData`), `.spec/specifications/02-calendar-engine.md` (`CalendarApiResponse` exists and stays unused by this phase), `.spec/specifications/03-weather-engine.md` (`WeatherApiResponse`, `describeWeatherCode`). Do not reopen the PIN-gate, calendar engine, or weather engine unless they are broken.

This specification covers the kiosk shell on `/`: a header clock, a header weather widget, and the existing lock control. The region under the header stays empty. Month, week, and day calendars, the filter bar, and the idle view-reset are out of scope.

## User Scenarios & Testing

### User Story 1 — The wall is one fixed kiosk surface (Priority: P1)

A glance from about 3 feet sees a dark full-screen dashboard. The clock and the weather sit in a header. Nothing on the page scrolls the document. In live mode the existing lock control stays bottom-left. In demo mode it stays hidden.

**Why this priority**: Constitution I. Guided Access has no browser chrome. A scrollbar or a second page of widgets makes the wall look broken.

**Independent Test**: Open `/` at 1180×820 landscape. The document does not scroll. The background is `#0a0a0f`. A header contains the clock and the weather widget. The area below the header is empty (no month grid, no filter chips, no "coming soon" copy). In demo mode there is no "Lock dashboard" control. `html` and `body` stay `position: fixed` with `overflow: hidden`.

**Acceptance Scenarios**:

1. **Given** `/` in demo mode, **When** the viewport is 1180×820, 1366×1024, or 1920×1080 landscape, **Then** `document.documentElement.scrollHeight` does not exceed the layout viewport, there is no document scrollbar, and no descendant introduces page-level scroll. The shell fills the fixed body (`h-full` / `min-h-0`). It MUST NOT add a second `100dvh` box inside the body, because `body` already pads `env(safe-area-inset-*)`.
2. **Given** the shell, **When** it is laid out, **Then** the clock is on the header start side and the weather widget is on the header end side. Both stay inside the viewport and clear of the bottom-left lock control (`bottom-16 left-4`, 44×44pt).
3. **Given** demo mode, **When** `/` renders, **Then** `components/layout/LockControl.tsx` is not mounted. **Given** live mode, **When** `/` renders, **Then** that same component is mounted, still bottom-left, still confirm-then-`POST /api/auth/lock`. This phase MUST NOT restyle or rewrite `LockControl`.
4. **Given** the shell, **When** its client modules are inspected, **Then** they do not import `lib/config.ts`, `lib/calendar-engine.ts`, `lib/weather-engine.ts`, `lib/calendar-cache.ts`, or `lib/weather-cache.ts`, and they do not call `GET /api/calendar`.

---

### User Story 2 — The clock shows household time (Priority: P1)

The header clock shows the time and the date in the dashboard timezone. The default is 12-hour with AM/PM (`TIME_FORMAT` unset or `12h`, timezone `America/New_York`). `TIME_FORMAT=24h` shows a 24-hour clock. The clock updates when the displayed minute changes and does not use `setInterval`.

**Why this priority**: A wall calendar that shows the laptop's zone or a frozen SSR time is wrong at a glance.

**Independent Test**: With default config, the clock text matches `formatTime(new Date(), "12h", "America/New_York")` for the current minute (AM or PM visible) and shows the weekday and calendar date in `America/New_York`. After mount, the time string is not server-rendered. Leaving the page cancels the animation frame.

**Acceptance Scenarios**:

1. **Given** `app/page.tsx` (server), **When** it renders the shell, **Then** it reads `getDashboardConfig()` and passes only `timezone`, `timeFormat`, `temperatureUnit`, `location.displayName`, and `isDemoMode` into client widgets. Latitude, longitude, calendar sources, and any PIN-related value stay on the server.
2. **Given** default config, **When** the clock is showing, **Then** the time uses `formatTime` from `lib/date-utils.ts` with `timeFormat: "12h"` and `timezone: "America/New_York"`, so the string includes minutes and an AM/PM marker and omits seconds. A date line under it uses `en-US` with that same timezone (weekday, month, day).
3. **Given** `TIME_FORMAT=24h`, **When** the clock renders, **Then** `formatTime` is called with `"24h"` and the string has no AM/PM marker.
4. **Given** the mounted clock, **When** it updates, **Then** it schedules work with `requestAnimationFrame` and calls `setState` only when the formatted minute or the formatted date changes. It MUST NOT call `setInterval`. Unmount MUST `cancelAnimationFrame`. The time text MUST render only after client mount so SSR cannot hydrate a different minute.

---

### User Story 3 — Weather is a glance, not a second page (Priority: P1)

The weather widget reads `GET /api/weather` through SWR and paints the current condition with a Lucide icon. Day and night may swap the clear-sky icons using `current.isDay`. A short strip shows today and the next two forecast days. If the forecast is missing, the header says weather is unavailable and the clock stays up.

**Why this priority**: Phase 3 already returns `WeatherApiResponse`. This phase is the first surface that shows it on the wall.

**Independent Test**: In demo mode, `/` shows the location display name (`Scarsdale, NY` by default), a rounded current temperature with °F, the WMO label, a Lucide SVG for that code, and three daily highs/lows when `weather.daily.length >= 3`. The widget's fetch sends `Accept: application/json` and parses `WeatherApiResponse`. A `weather: null` body, or a failed fetch, leaves the clock visible and shows a muted unavailable state.

**Acceptance Scenarios**:

1. **Given** `lib/hooks/useWeather.ts`, **When** the widget mounts, **Then** SWR fetches `/api/weather` with `Accept: application/json` (so the route returns `WeatherApiResponse`, not the HTML review page). `refreshInterval` is 1_800_000 ms. The hook unsubscribes on unmount.
2. **Given** `weather` is non-null, **When** the widget renders, **Then** it shows `location.displayName` (prop, not a new `WeatherData` field), the current temperature rounded with °F or °C from `temperatureUnit`, and `describeWeatherCode(current.weatherCode).label`. It shows the first three `daily` rows when they exist (short weekday in the dashboard timezone, icon, rounded high and low). It does not draw humidity, wind, apparent temperature, or precipitation.
3. **Given** a Lucide `icon` string from `describeWeatherCode`, **When** the widget picks a component, **Then** it uses the name as-is while `current.isDay` is true. While `current.isDay` is false, `Sun` renders as `Moon` and `CloudSun` renders as `CloudMoon`. Every other name is unchanged. An unknown name renders `Cloud`. Icons are decorative (`aria-hidden`); the label is text. This swap lives in the widget. `lib/wmo-codes.ts` stays unchanged.
4. **Given** SWR has no data yet, **When** the header renders, **Then** the weather slot keeps a stable block of header height and does not show a spinner that grows the document. **Given** `weather: null`, a non-OK response, or a fetch error, **When** the widget settles, **Then** it shows a short unavailable message and still does not scroll the page. **Given** `stale: true` with a `weather` object, **When** the widget renders, **Then** it shows that last-known forecast.

---

### Edge Cases

- **PIN-gate**: Already implemented. This phase MUST NOT edit `middleware.ts`, `/unlock`, or the auth routes. Demo mode already reaches `/` and `/api/weather` without a cookie.
- **Calendar engine**: Do not call `GET /api/calendar`. Do not add `useCalendarData`. `CalendarApiResponse` stays the Phase 2 contract and is not consumed here.
- **Weather engine**: Do not change `WeatherData`, `WeatherApiResponse`, cache TTL, Open-Meteo mapping, or the WMO table. Day/night is a render-time swap only.
- **Lock control**: Keep `components/layout/LockControl.tsx`. Bottom-left, 44×44pt, hidden in demo mode, confirm before lock. Idle timers do not exist in this phase and MUST NOT be added.
- **Empty main**: The region under the header is an empty dark surface. No month grid, week grid, day list, filter chips, or placeholder marketing copy.
- **Fewer than three days**: Render the daily rows that exist. Do not invent days.
- **Units**: Fahrenheit is the default. Celsius shows °C. Do not convert temperatures in the widget; Open-Meteo already returned the configured unit.
- **Secrets**: Client props are the display subset only. Bundles and the weather JSON still contain no PIN and no ICS URL.
- **Clock zone vs browser zone**: Formatting uses the `timezone` prop. Do not use `Date#getHours()` or the browser's local zone for the displayed time or date.
- **Hit targets**: Clock and weather are not buttons. The only new-or-kept control is `LockControl`, already ≥ 44×44pt. Do not add hover-only affordances.

## Requirements

### Functional Requirements — Shell

- **FR-001**: `app/page.tsx` stays a Server Component. It reads `getDashboardConfig()` / `isDemoMode()` and renders a shell plus the existing lock rule (`demo ? null : <LockControl />`). The page background stays `#0a0a0f`.
- **FR-002**: `components/layout/DashboardShell.tsx` lays out a header (clock start, weather end) and a flexible empty main (`min-h-0 flex-1`) that fills the rest of the fixed viewport. The shell uses the existing kiosk body; it does not set document overflow back to `auto`.
- **FR-003**: At 1180×820 the header and the empty main together stay inside the viewport with zero document scroll. The same composition at 1366×1024 and 1920×1080 stretches with the viewport and still has zero document scroll. Pixel overflow at any of those three sizes is a failure.
- **FR-004**: `LockControl` remains the component from Phase 1.5. This phase does not change its file.

### Functional Requirements — Display props

- **FR-005**: The only config values passed into client components are:

  | Prop | Source |
  |------|--------|
  | `timezone` | `getDashboardConfig().timezone` |
  | `timeFormat` | `getDashboardConfig().timeFormat` |
  | `temperatureUnit` | `getDashboardConfig().temperatureUnit` |
  | `locationName` | `getDashboardConfig().location.displayName` |

  Do not pass `latitude`, `longitude`, `idleTimeoutMs`, `cacheRevalidateSeconds`, calendar sources, or `icsUrl`.

### Functional Requirements — Clock

- **FR-006**: `components/widgets/ClockWidget.tsx` is a Client Component. Props are `timezone` and `timeFormat`. It displays `formatTime` from `lib/date-utils.ts` and a date line (`weekday: "long"`, `month: "long"`, `day: "numeric"`, `timeZone` = the prop, locale `en-US`).
- **FR-007**: The clock loop is `requestAnimationFrame`. State updates only when the formatted time or formatted date changes. Cleanup cancels the frame. No `setInterval`. The time is client-only after mount.
- **FR-008**: Default appearance is 12-hour. The time is the largest text on the shell (at least `text-5xl`). The date line uses the secondary text color already in `globals.css`.

### Functional Requirements — Weather widget

- **FR-009**: `lib/hooks/useWeather.ts` exports a client hook that uses SWR against `GET /api/weather`. The fetcher sends `Accept: application/json` and returns `WeatherApiResponse`. `refreshInterval` is 1_800_000. A non-OK response throws so SWR surfaces `error`.
- **FR-010**: `components/widgets/WeatherWidget.tsx` is a Client Component. It reads that hook. It does not import the weather engine or the weather cache.
- **FR-011**: Icon resolution is local to the widget:

  | `describeWeatherCode().icon` | `isDay === true` | `isDay === false` |
  |------------------------------|------------------|-------------------|
  | `Sun` | `Sun` | `Moon` |
  | `CloudSun` | `CloudSun` | `CloudMoon` |
  | any other known name | that icon | that icon |
  | unknown | `Cloud` | `Cloud` |

  Known names are the FR-008 set from the weather spec plus `Moon` and `CloudMoon`: `Sun`, `Moon`, `CloudSun`, `CloudMoon`, `Cloud`, `CloudFog`, `CloudDrizzle`, `CloudRain`, `CloudSnow`, `CloudLightning`. Import those named Lucide exports. Do not edit `lib/wmo-codes.ts`.
- **FR-012**: Current conditions show location name, rounded temperature with unit suffix, condition label, and one icon. The forecast strip shows `daily.slice(0, 3)`: short weekday from the `YYYY-MM-DD` date in `timezone` (do not shift the date with UTC `getDate()` math), that day's icon (day icon; forecast rows have no `isDay`), rounded high and low. Humidity, wind, apparent temperature, and precipitation stay off this widget.
- **FR-013**: Loading keeps the slot from collapsing. `weather: null` or a fetch error renders a muted "Weather unavailable" message. `stale: true` with a payload still renders the payload.

### Key Entities / Data Contracts

No new response types. The widget consumes the Phase 3 envelope:

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

`WeatherData.current.isDay` drives only the `Sun` / `CloudSun` night swap. `describeWeatherCode` is called at render time and is not stored on `WeatherData`.

`CalendarApiResponse` is unchanged and unused:

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

### Shell composition

```text
app/page.tsx (server)
  display props from getDashboardConfig()
  DashboardShell
    header: ClockWidget | WeatherWidget (SWR GET /api/weather JSON)
    main: empty
  demo ? null : LockControl (bottom-left, unchanged)
```

PIN-gate, `/api/calendar`, and `/api/weather` stay as they are. The shell does not start an idle timer.

## Success Criteria

- **SC-001**: At 1180×820 landscape, `/` shows a clock and a weather widget on a dark full-viewport shell with zero document scroll. The same is true at 1366×1024 and 1920×1080.
- **SC-002**: Default config shows a 12-hour clock (AM/PM) and the calendar date in `America/New_York`. The clock updates on the minute via `requestAnimationFrame` and does not use `setInterval`.
- **SC-003**: The weather widget shows live `WeatherApiResponse` data from SWR: location name, current temperature and condition, a Lucide icon, and up to three daily rows. `isDay === false` renders `Moon` for code 0 and `CloudMoon` for code 2.
- **SC-004**: A null or failed forecast shows "Weather unavailable" without removing the clock or scrolling the document.
- **SC-005**: Demo mode hides the lock control. Live mode still shows the existing bottom-left lock control. No month, week, day, or filter UI is present.
- **SC-006**: Client props and bundles add no PIN, no ICS URL, and no latitude/longitude.

## Assumptions

- Phase 1 kiosk CSS and viewport meta already lock the document. This phase fills that shell; it does not replace `globals.css` resets.
- `formatTime` in `lib/date-utils.ts` is client-safe (`Intl` only) and is the clock formatter.
- SWR and `lucide-react` are already dependencies. No new package.
- Default display config remains Scarsdale, `America/New_York`, 12-hour, Fahrenheit. `location.displayName` is the weather title.
- Open-Meteo may be slow or down during verification. The unavailable state is a pass for the failure path; a successful demo fetch is a pass for the data path.
- The empty main is reserved for Phase 5. This phase does not label it as a calendar.

## Out of Scope (this specification)

- Month view, week view, day view, and `CalendarViewMachine` (Phases 5–6)
- Filter bar (Phase 7)
- Idle view-reset back to month view (Phase 8)
- `GET /api/calendar` and any SWR calendar hook
- Changes to the PIN-gate, `LockControl`, the calendar engine, or the weather engine
- Editing the WMO table or adding `isDay` to `describeWeatherCode`
- Humidity, wind, apparent temperature, or precipitation on the widget
- Perpetual Framer Motion loops

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | Shell fills the fixed body inside 1180×820 with zero document scroll; also 1366×1024 and 1920×1080; lock target stays 44×44pt; no page-level scroll region |
| II Privacy | Client receives timezone, time format, temperature unit, and display name only; weather JSON is the existing envelope; calendar API is not called |
| III Appliance | rAF clock with cleanup, SWR interval aligned to the 1800s weather TTL, last-known or explicit unavailable weather, no idle lock, no `setInterval` |
