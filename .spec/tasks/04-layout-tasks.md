# Tasks: Base Layout and Ambient Widgets

**Input**: `.spec/specifications/04-layout-widgets.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 4 (base layout and ambient widgets). Phase 3 is already implemented (T027–T031); ignore the stale "Phase 3 deferred" row in `.spec/project.md`.
**Status**: Implemented 2026-09-22. T032–T035 complete. Human review next. Do not start Phase 5 until a new chat explicitly asks for it.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before Phase 5.

**Organization**: One implementation slice (Phase 4). PIN-gate, calendar
engine, weather engine, `WeatherData`, `WeatherApiResponse`, and
`describeWeatherCode` already exist — do not revisit them unless they
are broken.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US3]**: Maps to user stories in the specification
- Step IDs (`4.1` … `4.4`) are this phase's plan steps
- Task IDs continue from Phase 3 (`T031`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). `app/page.tsx`
stays a Server Component. Clock, weather widget, and `useWeather` are
Client Components. They MUST NOT import `lib/config.ts` or any server
engine/cache module.

**Do not start Phase 5 (month view) in the same chat as this implementation.**

---

## Phase 4: Base Layout and Ambient Widgets

**Purpose**: Kiosk shell on `/` with a clock and a weather widget inside
the 1180×820 bound, zero document scroll. Lock control stays bottom-left
and hidden in demo mode.

**Goal**: `/` shows household time and current weather (plus a 3-day
strip) on the existing dark shell. No calendar, filter bar, or idle
view-reset.

- [x] T032 [P] [US2] Step 4.1 — Implement `components/widgets/ClockWidget.tsx`
      as a Client Component. Props: `timezone: string` and
      `timeFormat: "12h" | "24h"`. After mount, show `formatTime` from
      `lib/date-utils.ts` (no seconds) and a date line via
      `Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone })`.
      Drive updates with `requestAnimationFrame`; `setState` only when the
      formatted minute or the formatted date changes; `cancelAnimationFrame`
      on unmount. Do not use `setInterval`. Do not render a time string
      during SSR. Time is at least `text-5xl`; date uses the existing
      secondary text color. Do not import `lib/config.ts`. File:
      `components/widgets/ClockWidget.tsx`.
- [x] T033 [P] [US3] Step 4.2 — Implement `lib/hooks/useWeather.ts` and
      `components/widgets/WeatherWidget.tsx`. The hook uses SWR on
      `/api/weather` with `Accept: application/json`, parses
      `WeatherApiResponse`, throws on non-OK, and sets `refreshInterval`
      to `1_800_000`. The widget shows `locationName`, rounded current
      temperature with °F or °C from `temperatureUnit`, the
      `describeWeatherCode` label, and a Lucide icon. Night swap only:
      `Sun` → `Moon` and `CloudSun` → `CloudMoon` when `current.isDay`
      is false; other codes stay on the Phase 3 name; unknown → `Cloud`.
      Named imports only (`Sun`, `Moon`, `CloudSun`, `CloudMoon`, `Cloud`,
      `CloudFog`, `CloudDrizzle`, `CloudRain`, `CloudSnow`,
      `CloudLightning`). Forecast strip is `daily.slice(0, 3)`: short
      weekday in `timezone` from the `YYYY-MM-DD` string, day icon, rounded
      high and low. Do not render humidity, wind, apparent temperature, or
      precipitation. Loading keeps a stable header block. `weather: null`
      or a fetch error shows "Weather unavailable". `stale: true` with a
      payload still renders it. Do not edit `lib/wmo-codes.ts` or the
      weather route. Files: `lib/hooks/useWeather.ts`,
      `components/widgets/WeatherWidget.tsx`.
- [x] T034 [US1] [US2] [US3] Step 4.3 — Compose the shell. Add
      `components/layout/DashboardShell.tsx`: header with clock at the
      start and weather at the end, then an empty `min-h-0 flex-1` main
      (no calendar, no filter, no placeholder copy). Update `app/page.tsx`
      so the server page reads `getDashboardConfig()`, passes only
      `timezone`, `timeFormat`, `temperatureUnit`, and
      `location.displayName` into the widgets, and still renders
      `demo ? null : <LockControl />` inside the relative full-height
      main (`#0a0a0f`). Fill the existing fixed body (`h-full min-h-0`);
      do not add a nested `h-dvh` / `100dvh` box. Do not edit
      `components/layout/LockControl.tsx`, `middleware.ts`, `globals.css`
      kiosk resets, or either API route. Files:
      `components/layout/DashboardShell.tsx`, `app/page.tsx`.
- [x] T035 [US1] [US2] [US3] Step 4.4 — Verification only (no new product
      files). Run the app and check `/` in the browser at 1180×820
      landscape per the gate below. Also confirm 1366×1024 and 1920×1080
      have no document scroll. Do not start the month view.

### Phase 4 Verification

`/` is a dark kiosk shell: clock and weather in the header, empty main,
zero document scroll at 1180×820. Lock control behavior is unchanged.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Viewport 1180×820 | Browser at 1180×820 landscape: no document scrollbar; `scrollHeight` of the document does not exceed the visual viewport; background `#0a0a0f` |
| Scale-up | 1366×1024 and 1920×1080 likewise have no document scroll and no cropped header |
| Shell | Header has clock (start) and weather (end). Main under the header is empty: no month/week/day grid, no filter chips |
| Clock | Default config shows AM or PM, no seconds, and the weekday plus calendar date. Displayed time matches `America/New_York` for the current minute. No `setInterval` in `ClockWidget.tsx` |
| Weather data | SWR request is `GET /api/weather` with JSON accept. Widget shows display name, rounded temperature and unit, WMO label, a Lucide SVG, and up to three daily high/low rows |
| Day/night | Code path: `isDay === false` maps `Sun` → `Moon` and `CloudSun` → `CloudMoon`. `lib/wmo-codes.ts` is unmodified |
| Unavailable | `weather: null` or a failed fetch shows "Weather unavailable" and the clock remains |
| Lock | Demo mode: no "Lock dashboard" button. Live mode: existing bottom-left `LockControl` still confirm-locks. File `LockControl.tsx` unchanged |
| Secrets | Client props do not include latitude, longitude, PIN, or any ICS URL. Shell does not call `/api/calendar` |
| Untouched | `middleware.ts`, calendar route, weather route, and WMO table unchanged |

**Do not start Phase 5 (month view) until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phases 1, 1.5, 2, and 3 complete (kiosk CSS, `LockControl`, `formatTime`, `GET /api/weather`, `describeWeatherCode`).
- **T032, T033**: Parallel (different files).
- **T034**: Depends on T032 and T033 (shell mounts both widgets).
- **T035**: Depends on T034.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Fixed shell, lock unchanged | T034, T035 | T035 at 1180×820 |
| US2 Household clock | T032, T034 | T035; clock text matches the dashboard zone |
| US3 Weather glance via SWR | T033, T034 | T035 with `/api/weather` JSON on the wall |

### Parallel Opportunities

```text
After spec approval + "implement Phase 4":
  T032 and T033 in parallel
  then T034 (shell + page wiring)
  then T035 (browser verification at 1180×820)
```

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/04-layout-widgets.md`.
2. Execute T032–T035 only after the explicit instruction
   **implement Phase 4**.
3. Run Phase 4 Verification in the browser at 1180×820 → stop if any
   check fails.
4. Stop. Do not implement the month view, filter bar, or idle view-reset.

### MVP increment for this feature

US1 plus US2 (shell and clock, no document scroll) is the smallest
visible slice. US3 is required before calling Phase 4 complete, because
the weather widget is the other half of this phase.

---

## Notes

- Clock updates are rAF-only. Re-render when the displayed minute (or
  the date) changes, not every frame.
- Weather polling matches the server TTL (1800s). Do not poll
  `/api/calendar`.
- Day/night icon swaps are render-time only. Do not change
  `describeWeatherCode`.
- Do not revisit the PIN-gate, calendar engine, or weather engine unless
  a Phase 4 change regresses them.
- Browser verification is part of T035. A screenshot of the header is
  not enough; confirm the document does not scroll and the weather
  request returns JSON.
