# Specification: Frame-Ready Shell

**Feature ID**: `10-frame-shell`
**Created**: 2026-10-27
**Status**: Draft, pending owner review. Implementation starts only on "implement Phase 10".
**Input**: Family wall redesign plan (Navigation, Today, Calendar tab sections); wall dashboard readiness review (2026-10-26); the `/wall` prototype from PR #11
**Constitution check**: Principles I (1920×1080 wall, named scroll regions, 44×44 targets), II (WebView 124 floor, 250 KB budget, no blur), III (PIN-gate on `/`), IV (rAF clock, idle to Today, bounded polling)
**Project context**: `.spec/project.md`
**Depends on**: `00-platform-baseline.md`

The tabbed wall becomes the app. It moves from `/wall` to `/`, the
iPad-era wall is removed, Today and Calendar run on real data, and CI starts
enforcing the v2.0.0 gates, including the WebView 124 floor. Meals,
Shopping, To-dos, notes, and photos keep their prototype sample data in
this phase, clearly flagged, until Phases 11 to 14 replace it.

## User Scenarios & Testing

### User Story 1 — The frame opens on Today at the site root (Priority: P1)

The kiosk app loads the live URL. After the PIN (once), the wall shows the
left rail and the Today tab at `/`, filling 1920×1080.

**Why this priority**: The kiosk app loads one URL. It has to be the real
wall, not a prototype path.

**Independent Test**: Open `/` at 1920×1080 in demo mode. The rail and
Today render. `/wall` and `/wall#meals` redirect to `/` and `/#meals`.
Nothing from the old header wall renders anywhere.

**Acceptance Scenarios**:

1. **Given** demo mode, **When** `/` loads at 1920×1080, **Then** the rail
   shows Today, Calendar, Meals, Shopping, To-dos, Photos, the clock, and
   (live only) the lock, and the Today tab is active.
2. **Given** `/#calendar`, **When** it loads, **Then** the Calendar tab
   opens. Each tab has a hash deep link.
3. **Given** a request for `/wall` or `/wall/list`, **When** it arrives,
   **Then** it gets a permanent redirect to `/` or `/list`.
4. **Given** live mode without a cookie, **When** `/` loads, **Then** it
   redirects to `/unlock`, and after unlocking returns to `/`.

### User Story 2 — Today shows the real day (Priority: P1)

Today's header, hero, and lanes come from the real calendars and weather.

**Why this priority**: Today is the resting screen; it is what the family
sees from across the kitchen.

**Independent Test**: Live mode with `fixture:mock.ics` and an unlocked
session. Today's lanes list today's remaining fixture events by person. The
weather strip shows hours from now to bedtime from `/api/weather`.

**Acceptance Scenarios**:

1. **Given** live weather, **When** Today renders, **Then** the header shows
   the clock, the date, the current temperature and condition, today's high
   and low, an hourly strip from the current hour to 9 PM (at least 4
   hours; after 5 PM it runs to midnight), and one plain sentence built
   from the hourly data (for example "Rain from 4 PM. Pack a rain
   jacket.").
2. **Given** a timed event that has not ended today (or the first one
   tomorrow after the last one today), **When** Today renders, **Then** the
   Next up card shows its person, title, time, place, and minutes until it
   starts. A "Leave in N min" pill appears when
   `minutes until start − travel buffer` is between 0 and 60, using
   `CAL_<ID>_TRAVEL_MIN` (default 15). All-day events never get the pill.
3. **Given** calendars with category `person`, **When** the lanes render,
   **Then** each person calendar gets one lane with its label and color, and
   `shared`, `utility`, and `external` calendars share one Family lane. Each
   lane lists today's events that have not ended.
4. **Given** demo mode, **When** Today renders, **Then** it uses the
   prototype's realistic sample day and sample weather, and shows the
   "Sample data" flag.
5. **Given** the weather or calendar API is stale or down, **When** Today
   renders, **Then** it shows the last-known data and does not blank.

### User Story 3 — Calendar is a planning tool, not the ambient screen (Priority: P1)

**Why this priority**: The redesign plan moved the ambient role to Today;
the calendar's old idle and header behavior now fight it.

**Independent Test**: Open Calendar, switch to Week, wait past the idle
timeout. The wall goes to Today. Opening Calendar again shows Week.

**Acceptance Scenarios**:

1. **Given** the Calendar tab, **When** it renders, **Then** it has no
   clock or weather header; the grid uses the full tab height.
2. **Given** the Month view, **When** it renders, **Then** it is labeled
   "Month", shows the rolling 4 weeks anchored on the current week, and has
   back and forward controls that page 4 weeks at a time within the
   calendar window (−7 / +45 days). A "Today" control returns to the anchor.
3. **Given** the Month view, **When** the user taps today's cell, **Then**
   the wall switches to the Today tab. Tapping any other day opens Day view
   for that day.
4. **Given** any Calendar view, **When** the wall's idle timeout fires,
   **Then** the wall goes to Today and the Calendar keeps its view, anchor,
   and filters for the next visit. The calendar's own idle reset no longer
   runs inside the wall.
5. **Given** the Month view, **When** it renders, **Then** event chips show
   short start times ("9a Yoga", "4:30p Piano") and all-day events show no
   time, at the prototype's larger type (event text about 20px).
6. **Given** the Week view, **When** it renders, **Then** the hour grid is a
   named scroll region with `overscroll-behavior: contain`.

### User Story 4 — The build can never outgrow WebView 124 (Priority: P1)

**Why this priority**: Constitution Principle II. The frame's engine can
never be updated.

**Independent Test**: In CI, the gated Playwright suite runs twice, on
current Chromium and on Chrome for Testing 124.0.6367.x. A build-output
scan and a bundle-size check run after `next build`.

**Acceptance Scenarios**:

1. **Given** `package.json`, **When** it is read, **Then** it has an
   explicit `browserslist` of `["chrome 111", "edge 111", "firefox 111",
   "safari 16.4"]` (Next.js 16's default, all at or below Chrome 124).
2. **Given** `npm run check:browser-floor`, **When** it runs after a build,
   **Then** it fails if the resolved browserslist includes any Chrome target
   above 124, if `.next/static` contains a pattern from its post-124 list
   that is not on its reviewed allowlist, or if the initial JavaScript for
   `/` exceeds 250 KB gzip.
3. **Given** the post-124 list, **When** it is reviewed, **Then** it covers
   at least: CSS anchor positioning (`anchor-name`, `position-anchor`,
   `@position-try`), `@view-transition`, `interpolate-size`, `calc-size(`,
   CSS `round(`, `mod(`, `rem(`, `if(`, `sibling-index(`, and JS
   `URL.parse(`, `Promise.try(`, `Float16Array`, `Iterator.from(`,
   `RegExp.escape(` (allowed only inside the core-js polyfill),
   `Math.sumPrecise(`, `Uint8Array.fromBase64(`. Guarded uses already in
   React and Next (`startViewTransition`, `navigation.addEventListener`)
   are allowlisted with the reason.
4. **Given** the Chromium 124 project, **When** the viewport, auth, and
   uptime suites run on it, **Then** they pass.
5. **Given** `app/wall/wall.css` and `app/globals.css`, **When** they are
   checked, **Then** they use no `backdrop-filter` and no `filter: blur()`.

### User Story 5 — The gates match constitution v2.0.0 (Priority: P1)

**Independent Test**: `npm run test:e2e` passes with the new viewport list,
and the old three-size list is gone.

**Acceptance Scenarios**:

1. **Given** the viewport gate, **When** it runs, **Then** every tab at
   1920×1080 has no document scroll, no overflow, and no visible button
   under 44×44 CSS px, including inside the Calendar tab.
2. **Given** the scroll-region check, **When** it runs on each tab, **Then**
   every element whose computed `overflow-y` is `auto` or `scroll` carries
   a `data-scroll-region` attribute with a name from the spec's list and has
   `overscroll-behavior: contain`. In this phase the list is `week-grid`,
   `shopping-list`, `todo-list`, and `meal-steps`.
3. **Given** the auth gate with a PIN set, **When** it runs, **Then** `/`,
   `/list`, `/api/calendar`, and `/api/weather` redirect or 401 without a
   cookie, and `/unlock` and `/api/health` stay reachable.
4. **Given** the uptime gate with `IDLE_TIMEOUT_MS=2000`, **When** the test
   opens Calendar, Meals, Shopping, and To-dos in turn and waits, **Then**
   each returns to Today; Photos does not.
5. **Given** the leak check, **When** the test cycles all six tabs 30
   times, **Then** the document's element count and the number of active
   `requestAnimationFrame` and interval handles (counted by an instrumented
   test build hook) return to within 10% of their first-cycle values.
6. **Given** `/list` at 390×844, **When** it loads, **Then** it has no
   horizontal overflow and no button under 44×44.

### User Story 6 — The iPad-era code is gone (Priority: P2)

**Independent Test**: `git grep` finds no `1180`, `Guided Access`,
`RotateNotice`, `DashboardShell`, `ClockWidget`, or `WeatherWidget` in
`app/`, `components/`, `lib/`, or `e2e/`.

**Acceptance Scenarios**:

1. **Given** the repo, **When** Phase 10 lands, **Then** the old `/` page,
   `DashboardShell`, `RotateNotice`, `ClockWidget`, `WeatherWidget`, the
   `.kiosk-*` scale-to-fit and rotate-notice CSS, and the iPad breakpoint
   tokens are deleted. The wall's own `--u` scaling is the only scaling for
   smaller screens.
2. **Given** `app/manifest.ts`, **When** it is read, **Then** the name is
   "Family Wall", `start_url` is `/`, `display` is `standalone`, and there
   is no `orientation` lock (the phone page is portrait).
3. **Given** `middleware.ts`, **When** Phase 10 lands, **Then** it is
   renamed to `proxy.ts` with an exported `proxy` function (the Next.js 16
   convention), with identical behavior.
4. **Given** the calendar view components, **When** Phase 10 lands, **Then**
   `MonthView`, `WeekView`, `DayView`, `FilterBar`, `ViewToolbar`, and
   `CalendarViewMachine` remain, restyled only as the wall needs.

### Edge Cases

- No person calendars configured: Today shows one Family lane.
- No events left today: the hero shows the first event tomorrow, labeled
  "Tomorrow"; if none within the window, it shows "Nothing else today".
- Midnight: Today, the hero, and the Month anchor roll over without a
  reload (the clock's day change re-derives them).
- Open-Meteo returns no hourly data: the strip hides and the sentence falls
  back to the daily condition.
- Smaller desktop browser: the wall scales down with `--u`; this is
  best-effort and outside the gate.

## Requirements

### Functional Requirements — Routing and shell

- **FR-001**: `app/page.tsx` MUST render the tabbed wall (today's
  `app/wall/page.tsx` content). `app/wall/layout.tsx` (fonts, `wall.css`)
  MUST move to the root layout or a route group that covers `/` and
  `/list`.
- **FR-002**: `/wall` and `/wall/list` MUST permanently redirect (308) to
  `/` and `/list`, configured in `next.config.ts` `redirects()`.
- **FR-003**: The phone page MUST move to `app/list/page.tsx`. Its
  behavior in this phase is the prototype's (browser-only sample data);
  Phase 12 makes it real.
- **FR-004**: The root layout MUST keep the viewport rules of Principle I
  (`width=device-width`, `initialScale: 1`, `maximumScale: 1`,
  `userScalable: false`) and MAY keep Apple web-app meta tags for the phone
  page's home-screen icon.
- **FR-005**: The `?demo=1` dev-only preview flag MUST keep working in
  development and MUST stay inert in production.

### Functional Requirements — Today

- **FR-006**: `lib/weather-engine.ts` MUST also request Open-Meteo
  `hourly=temperature_2m,weather_code,precipitation_probability` with
  `forecast_hours=24`, and `WeatherData` MUST gain
  `hourly: Array<{ time: string; temperature: number; weatherCode: number;
  precipitationProbability: number }>`. The cache key MUST include the
  hourly request. Existing fields stay unchanged.
- **FR-007**: `lib/wall/weather-sentence.ts` MUST build the header sentence
  from hourly data with fixed rules: the first hour with precipitation
  probability ≥ 50% gives "Rain from <time>." plus a jacket hint (snow codes
  give "Snow from <time>."); otherwise a high ≥ 85°F gives "Hot today." and
  a low ≤ 32°F gives "Freezing tonight."; otherwise the daily condition
  label. Unit-tested.
- **FR-008**: `CalendarSource` MUST gain `travelMinutes` from
  `CAL_<ID>_TRAVEL_MIN` (integer 0–120, default 15). It is safe to send to
  the client as `calendarTravelMinutes` on `UnifiedEvent`.
- **FR-009**: Next up selection, lanes, and the Leave-in pill MUST follow
  User Story 2 and live in a pure, unit-tested module
  (`lib/wall/today.ts`).
- **FR-010**: In live mode before Phases 11–14, the Today tiles for dinner,
  shopping, to-dos, notes, and photos MUST read the prototype store and the
  wall MUST show the "Sample data" flag on those tiles only.

### Functional Requirements — Calendar tab

- **FR-011**: `CalendarViewMachine` MUST accept `idleReset={false}` from the
  wall, which disables its internal idle timer, and an `onToday` callback
  used when today's cell is tapped.
- **FR-012**: Month view MUST be labeled "Month" and page by 4 weeks with
  back, forward, and Today controls, bounded by the −7 / +45 day window.
- **FR-013**: The calendar's dark theme, header, and lock placement MUST be
  removed. The lock is on the rail only.

### Functional Requirements — Gates and floor

- **FR-014**: `e2e/gate-env.ts` MUST export `WALL_VIEWPORT = { width: 1920,
  height: 1080 }` and `PHONE_VIEWPORT = { width: 390, height: 844 }`. The
  three-size `VIEWPORTS` list MUST be removed.
- **FR-015**: `playwright.config.ts` MUST define a `chromium-124` project
  that launches Chrome for Testing 124.0.6367.x from
  `CHROME_124_PATH`. CI MUST install the newest Chrome for Testing
  124.0.6367.x build with `npx @puppeteer/browsers install chrome@<version>`
  (version pinned in the workflow) and cache it. If
  Playwright cannot drive that build, the phase MUST stop and report it,
  not skip the project.
- **FR-016**: `scripts/check-browser-floor.mjs` and
  `npm run check:browser-floor` MUST implement User Story 4 scenarios 2
  and 3, and `gates.yml` MUST run it after the build.
- **FR-017**: Named scroll regions MUST carry `data-scroll-region="<name>"`.
  The e2e scroll check MUST read the allowed names from one exported list.
- **FR-018**: The leak check hook MUST exist only when
  `NEXT_PUBLIC_GATE_HOOKS=1` at build time, and the gates build MUST set it
  for the e2e server only.
- **FR-019**: The README MUST describe the tabbed wall at `/`, the frame,
  and the phone page, and drop the iPad and Guided Access instructions.

## Success Criteria

- **SC-001**: `/` at 1920×1080 shows the tabbed wall with no scroll on
  every tab, on current Chromium and Chromium 124.
- **SC-002**: The wall route's initial JavaScript is ≤ 250 KB gzip
  (about 198 KB on `master` at `7acdc2c`).
- **SC-003**: With fixture feeds, Today's lanes and hero match the fixture's
  remaining events for the test clock.
- **SC-004**: All v2.0.0 gates that this phase delivers pass in CI:
  viewport, frame browser, bundle, auth (pages and engines), uptime (idle,
  leaks), and secret. The device gate is recorded as pending until Phase 15.

## Assumptions

- Chrome for Testing 124 behaves closely enough to Android WebView 124 for
  CI; the device gate in Phase 15 covers the rest.
- The prototype's visual design (paper theme, Archivo and Instrument Serif)
  is approved as is.

## Out of Scope

- Server-saved lists, to-dos, meals, notes (Phases 11–13) and real photos
  (Phase 14).
- The kiosk app and frame setup (Phase 15).
- Night dimming and a dark theme.

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| FR-001 to FR-005, FR-014, FR-017 | I (1920×1080 wall, phone page gate, scroll regions) |
| FR-006 to FR-010 | IV (stale over blank, rAF clock) |
| FR-011 to FR-013 | IV (idle returns to Today, no session effect) |
| FR-015, FR-016 | II (WebView 124 floor, budget) |
| FR-018 | III (no test hooks in production bundles) |
