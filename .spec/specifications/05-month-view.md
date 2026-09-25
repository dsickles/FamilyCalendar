# Specification: Rolling 4-Week Month View

**Feature ID**: `05-month-view`
**Created**: 2026-09-22
**Status**: Review complete 2026-09-25. Implemented 2026-09-22. T036–T039 complete. Do not start Phase 6 in this thread.
**Input**: `.spec/project.md` Phase 5 ("Month view (4-week rolling)") and the runtime shape (`CalendarViewMachine` → Month is the only mode this phase builds). `.spec/project.md` still lists Phases 3 and 4 as deferred. Phase 3 is implemented (T027–T031). Phase 4 is implemented (T032–T035). Trust `.spec/specifications/03-weather-engine.md`, `.spec/tasks/03-weather-tasks.md`, `.spec/specifications/04-layout-widgets.md`, and `.spec/tasks/04-layout-tasks.md`.
**Constitution check**: Principle I (1180×820 bound, zero document scroll, no contained scroll on the month grid — contained scroll is Week view only — scale to 1366×1024 and 1920×1080, 44×44pt on the existing lock control), Principle II (no PIN, ICS URL, or lat/lon added to the client; events are `UnifiedEvent` without `icsUrl`), Principle III (SWR cleans up on unmount, calendar poll aligned to the 600s cache TTL, last-known events over a blank wall, anchor date rolls overnight without `setInterval`, no idle lock)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (`UnifiedEvent`, `CalendarViewState`, `weekStartDay` default `0`), `.spec/specifications/02-calendar-engine.md` (`CalendarApiResponse` only — do not change the engine or the route), `.spec/specifications/04-layout-widgets.md` (the shell this grid fills). Do not reopen the PIN-gate, calendar engine, weather engine, clock, weather widget, or `LockControl` unless they are broken.

This specification fills the empty main under the existing header with a rolling 4-week month grid. The grid is anchored on today in the dashboard timezone. Weeks start on Sunday when `WEEK_START_DAY=0`. Events come from `GET /api/calendar` through SWR as `CalendarApiResponse`. Each drawn event shows its title and calendar color. The clock and the weather widget stay on one header row (current conditions and the three forecast days side by side, not stacked under the clock). `LockControl` sits at the far right of that header, after the weather, so it does not cover a day cell. It stays hidden in demo mode. The dashboard is laid out in a fixed 1180×820 stage, centered, and only scaled down when the window is smaller than that stage. Week view, day view, the filter bar, and the idle view-reset are out of scope.

## User Scenarios & Testing

### User Story 1 — The wall shows four weeks from today (Priority: P1)

A glance from about 3 feet sees the same dark shell as Phase 4, plus a month grid in the space under the header. The grid is 4 rows of 7 days. With the default `WEEK_START_DAY=0`, the first column is Sunday. The week that contains today is the first row, and the next three weeks follow. Today is marked. The document does not scroll.

**Why this priority**: Constitution I and the product intent. The ambient surface is this 4-week grid, not a civil month and not an empty main.

**Independent Test**: Open `/` in demo mode at 1180×820 landscape. The header still has the clock and the weather widget. Under it, a 4×7 grid shows 28 consecutive dashboard dates starting on the Sunday of the current week (`America/New_York`). Today's cell is visually distinct. `document.documentElement.scrollHeight` does not exceed the layout viewport. There is no scrollbar on the document, the grid, or a day cell.

**Acceptance Scenarios**:

1. **Given** default config (`weekStartDay` `0`, timezone `America/New_York`), **When** `/` renders, **Then** the main under the header is a grid of exactly 4 week rows and 7 day columns. Column 0 is Sunday and the header labels read Sun through Sat in that order. The first cell is `getWeekBounds(today, 0, timezone).start` in that timezone. The last cell is 27 dashboard days later. Today lies on that span and its cell is marked.
2. **Given** the grid, **When** the viewport is 1180×820, 1366×1024, or 1920×1080 landscape, **Then** the header, the grid, and the lock control stay inside the viewport. `scrollHeight` of the document does not exceed the layout viewport. The grid and each day cell use overflow clipping. They MUST NOT set `overflow` to `auto` or `scroll`. Contained scroll remains forbidden outside Week view, which this phase does not build.
3. **Given** the shell from Phase 4, **When** this phase mounts, **Then** the clock and the weather widget stay in the header (clock start, weather end). `LockControl` stays the Phase 1.5 component: hidden in demo mode, bottom-left (`bottom-16 left-4`, 44×44pt, `z-20`) in live mode, confirm-then-`POST /api/auth/lock`. The month grid MUST NOT use a z-index at or above 20. This phase MUST NOT edit `LockControl.tsx`, `ClockWidget.tsx`, or `WeatherWidget.tsx`.
4. **Given** the mounted grid, **When** the dashboard-timezone calendar date changes (including across midnight), **Then** the 28-day window recomputes from that new today. The update uses `requestAnimationFrame`, calls `setState` only when the zoned `YYYY-MM-DD` changes, and `cancelAnimationFrame` on unmount. It MUST NOT use `setInterval`. It MUST NOT read the browser's local zone via `Date#getDay()` for column placement.

---

### User Story 2 — Events sit on the days they occupy (Priority: P1)

The grid reads `GET /api/calendar` through SWR and paints each in-range event's title and calendar color on every grid day the event overlaps. Events outside the 28 days stay off the grid even though the API window is wider (−7 / +45). A failed fetch leaves the day numbers up and says the calendar is unavailable. A stale payload still shows its events.

**Why this priority**: Phase 2 already returns `CalendarApiResponse`. This phase is the first surface that shows those events on the wall.

**Independent Test**: In demo mode, `/` fetches `GET /api/calendar` with `Accept: application/json` and parses `CalendarApiResponse`. Demo events whose interval overlaps a visible day show that event's `title` and a color mark using `calendarColor`. "Standup" (today, Alex, `#6366f1`) appears on today's cell. An event that ends before the Sunday that starts the grid does not appear. Description, location, and a clock time are not required on the chip.

**Acceptance Scenarios**:

1. **Given** `lib/hooks/useCalendar.ts`, **When** the month view mounts, **Then** SWR fetches `/api/calendar` with `Accept: application/json` and types the body as `CalendarApiResponse`. `refreshInterval` is 600_000 ms. A non-OK response throws so SWR surfaces `error`. The hook unsubscribes on unmount. The hook MUST NOT import `lib/config.ts`, `lib/calendar-engine.ts`, `lib/calendar-cache.ts`, `lib/weather-engine.ts`, or `lib/weather-cache.ts`.
2. **Given** `events` is an array, **When** the grid places them, **Then** an event is drawn on day D when `startTime < D.end` and `endTime > D.start`, using `getDayBounds` in the `timezone` prop. Within a cell, chips keep `startTime` ascending, then `id`. Only `title` and `calendarColor` are shown: the title is one truncated line, and `calendarColor` is a left border or swatch on a dark chip (the chip fill stays dark so a light hex cannot wash out the title). The chip is not a link or a button. Description, location, and a formatted time stay off the chip.
3. **Given** more chips than the cell can show, **When** the cell paints, **Then** overflow is clipped. The cell does not grow the grid and does not scroll. There is no control that opens a day or week view.
4. **Given** SWR has no data yet, **When** the main renders, **Then** the 4×7 day numbers are already visible and the main does not grow. **Given** a fetch error and no event array, **When** the view settles, **Then** it shows a short "Calendar unavailable" message and still does not scroll the page. **Given** `stale: true` with an `events` array, or a non-empty `errors` array alongside events, **When** the grid renders, **Then** it shows those events. An empty `events` array renders day numbers and no chips, without the unavailable message.

---

### Edge Cases

- **PIN-gate**: Already implemented. This phase MUST NOT edit `middleware.ts`, `/unlock`, or the auth routes. Demo mode already reaches `/` and `/api/calendar` without a cookie.
- **Calendar engine**: Do not change `UnifiedEvent`, `CalendarApiResponse`, the −7 / +45 window, cache TTL, or `app/api/calendar/route.ts`. This phase only consumes the JSON envelope.
- **Weather, clock, lock**: Do not restyle or rewrite those components. Do not start an idle timer. `IDLE_TIMEOUT_MS` is Phase 8 and MUST NOT be passed into the month view.
- **Civil month**: The grid is not "the 1st through the last of this month." It is four weeks anchored on today. Days that fall in an adjacent civil month still show their day number at the same strength.
- **`WEEK_START_DAY=1`**: The component receives `weekStartDay` from config. `1` starts the week on Monday. Acceptance for this phase is the default `0` (Sunday). Do not hardcode Sunday in a way that ignores the prop.
- **Multi-day overlap**: A span that covers two grid midnights is drawn on each overlapped day. An event that ends exactly at the next dashboard midnight (`endTime === D.end` of the start day, and `endTime === next.start`) is drawn only on the start day, because the comparison is half-open.
- **API window vs grid**: Events earlier than the grid Sunday or later than day 28 are in the payload and MUST NOT be drawn.
- **Filter chips**: Do not read or write `activeFilters`. Every in-range event is shown. Subsetting is Phase 7.
- **View machine**: Do not add week or day modes, `selectedWeekStart`, `selectedDay`, or `lastInteractionAt` updates. `CalendarViewState` stays the Phase 1 type and is not driven by this phase.
- **Secrets**: Client props are `timezone` and `weekStartDay` only, plus the props Phase 4 already passes to the clock and the weather widget. Bundles and the calendar JSON still contain no PIN and no ICS URL.
- **Hit targets**: Event chips and day cells are not controls. The only control on `/` remains `LockControl`, already ≥ 44×44pt. Do not add hover-only affordances.

## Requirements

### Functional Requirements — Shell

- **FR-001**: `app/page.tsx` stays a Server Component. It still reads `getDashboardConfig()` and renders `demo ? null : <LockControl />`. It passes the existing clock and weather props unchanged. It additionally passes `timezone` and `weekStartDay` into the month view. It MUST NOT pass `latitude`, `longitude`, `idleTimeoutMs`, `cacheRevalidateSeconds`, calendar sources, or `icsUrl`.
- **FR-002**: `components/layout/DashboardShell.tsx` keeps the header (clock start, weather end) and renders a `main` slot in the existing `min-h-0 flex-1 overflow-hidden` region. The shell still fills the fixed body. It MUST NOT add a nested `h-dvh` / `100dvh` box and MUST NOT set document overflow back to `auto`.
- **FR-003**: At 1180×820 the header and the 4-week grid together stay inside the viewport with zero document scroll. The same composition at 1366×1024 and 1920×1080 stretches with the viewport and still has zero document scroll. Pixel overflow at any of those three sizes is a failure.
- **FR-004**: `LockControl`, `ClockWidget`, and `WeatherWidget` remain the components from earlier phases. This phase does not change those files.

### Functional Requirements — Grid

- **FR-005**: `components/calendar/MonthView.tsx` is a Client Component. Props are `timezone: string` and `weekStartDay: 0 | 1`. It computes today with `Intl` in `timezone` (the same zoned calendar date `lib/date-utils.ts` already uses). The 28 cells start at `getWeekBounds(today, weekStartDay, timezone).start` and step with `getWindowStart`. Existing `lib/date-utils.ts` exports keep their current signatures and behavior; this phase does not rewrite them.
- **FR-006**: The grid is 7 columns and 4 week rows, plus a single weekday label row derived from those seven dates (`en-US`, `weekday: "short"`). Each cell shows its dashboard day-of-month. The cell for today is marked (background or ring) so it is distinguishable without color alone relying on a calendar hex. The grid uses equal fractional rows (`min-h-0`) so four weeks always fit the main.
- **FR-007**: The zoned-date loop is `requestAnimationFrame`. State updates only when the `YYYY-MM-DD` in `timezone` changes. Cleanup cancels the frame. No `setInterval`.

### Functional Requirements — Events

- **FR-008**: `lib/hooks/useCalendar.ts` exports a client hook that uses SWR against `GET /api/calendar`. The fetcher sends `Accept: application/json` and returns `CalendarApiResponse`. `refreshInterval` is 600_000. A non-OK response throws.
- **FR-009**: `MonthView` reads that hook. It does not import the calendar engine or the calendar cache. Placement follows User Story 2: half-open overlap with `getDayBounds`, in-cell order `startTime` then `id`.
- **FR-010**: A chip shows `title` (single line, ellipsis) and `calendarColor` as a left border or swatch. Chip text stays on the dark surface. Chips are not interactive. Cells use `overflow: hidden`. No day-view or week-view affordance, including no "+N" control.
- **FR-011**: Loading keeps the day grid. A fetch error with no `events` array renders a muted "Calendar unavailable" message inside the main. `stale: true` or feed `errors` with an `events` array still render that array. `events: []` renders an empty grid.

### Key Entities / Data Contracts

No new response types. The view consumes the Phase 2 envelope and the Phase 1 event:

```typescript
export interface CalendarApiResponse {
  events: UnifiedEvent[];
  fetchedAt: string; // ISO 8601
  stale: boolean;
  cache: "hit" | "miss" | "stale";
  errors: Array<{
    calendarId: string;
    calendarLabel: string;
    reason: "timeout" | "network" | "parse" | "unknown";
  }>;
}

export interface UnifiedEvent {
  id: string;
  calendarId: string;
  calendarLabel: string;
  calendarColor: string;
  calendarCategory: "person" | "shared" | "utility" | "external";
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO 8601
  endTime: string;
  isAllDay: boolean;
  isRecurring: boolean;
  originalUid: string;
}
```

`icsUrl` MUST NOT appear on `UnifiedEvent` or this envelope. This phase reads `id`, `title`, `calendarColor`, `startTime`, and `endTime`. It does not display `description`, `location`, `calendarLabel`, or `calendarCategory`.

`CalendarViewState` is unchanged and unused:

```typescript
export interface CalendarViewState {
  mode: "month" | "week" | "day";
  anchorDate: string; // "YYYY-MM-DD"
  selectedWeekStart?: string;
  selectedDay?: string;
  activeFilters: string[];
  lastInteractionAt: number;
}
```

The visible anchor is "today" in `timezone`. This phase does not store a `CalendarViewState` object.

### Shell composition

```text
app/page.tsx (server)
  display props from getDashboardConfig()
  DashboardShell
    header: ClockWidget | WeatherWidget (unchanged)
    main: MonthView
      SWR GET /api/calendar → CalendarApiResponse
      4 weeks × 7 days, weekStartDay (default Sunday)
      chips: title + calendarColor
  demo ? null : LockControl (bottom-left, unchanged)
```

PIN-gate, `/api/calendar`, and `/api/weather` stay as they are. The shell does not start an idle timer and does not mount a week view, a day view, or a filter bar.

## Success Criteria

- **SC-001**: At 1180×820 landscape, `/` shows the existing clock and weather header plus a 4-week grid anchored on today, week starting Sunday, with zero document scroll and no cell scrollbar. The same is true at 1366×1024 and 1920×1080.
- **SC-002**: Demo mode shows titles and calendar colors for events that overlap the 28 visible days, including a today event such as "Standup" in `#6366f1`. Events outside that span are not drawn.
- **SC-003**: The calendar request is SWR `GET /api/calendar` with `Accept: application/json`, refresh 600_000 ms, parsed as `CalendarApiResponse`. A failed fetch shows "Calendar unavailable" without removing the clock, the weather widget, or the day grid's ability to stay inside the viewport.
- **SC-004**: After the zoned date changes, the window moves to the new today without `setInterval`. The animation frame is cancelled on unmount.
- **SC-005**: Demo mode hides the lock control. Live mode still shows the existing bottom-left lock control. No week view, day view, filter chips, or idle view-reset is present.
- **SC-006**: Client props and bundles add no PIN, no ICS URL, and no latitude/longitude. `icsUrl` is absent from the calendar JSON.

## Assumptions

- Phase 1 kiosk CSS and viewport meta already lock the document. Phase 4 already built the header. This phase fills the empty main; it does not replace `globals.css` resets.
- `getWeekBounds`, `getWindowStart`, and `getDayBounds` in `lib/date-utils.ts` are client-safe (`Intl` only) and are the date tools for the grid.
- SWR is already a dependency. No new package. Framer Motion is not used on this grid.
- Default display config remains `America/New_York` and `weekStartDay` `0`.
- The API window (−7 / +45) already covers any 28-day span that starts on this week's Sunday. This phase does not request a custom range.
- Demo `generateDemoEvents()` already returns events around today, including titles and `#6366f1` / `#ec4899` / `#10b981` / `#8b5cf6`. This phase does not edit that generator.
- Open-Meteo and ICS hosts are irrelevant to the grid. Verification can use demo mode.

## Out of Scope (this specification)

- Week view and day view (Phase 6), including any tap that navigates to them
- Filter bar and client-side subsetting of `UnifiedEvent[]` (Phase 7)
- Idle view-reset back to month view (Phase 8); this phase is already the month view
- A `CalendarViewMachine` with modes other than the always-on month grid
- Changes to the PIN-gate, `LockControl`, the clock, the weather widget, the calendar engine, or the weather engine
- Event time, description, location, or calendar label on the chip
- Perpetual Framer Motion loops

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | 4-week grid fills the Phase 4 main inside 1180×820 with zero document scroll and no cell scroll; also 1366×1024 and 1920×1080; lock target stays 44×44pt and above the grid |
| II Privacy | Client receives `timezone` and `weekStartDay` plus the existing display props; calendar JSON is the existing envelope; no `icsUrl`, PIN, or coordinates |
| III Appliance | SWR interval aligned to the 600s calendar TTL, last-known events or an explicit unavailable line, rAF date roll with cleanup, no idle lock, no `setInterval` |
