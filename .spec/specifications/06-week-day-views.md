# Specification: Week View and Day View

**Feature ID**: `06-week-day-views`
**Created**: 2026-09-22
**Status**: Implemented 2026-09-22. T040–T043 complete. Human review next. Do not start Phase 7 in this thread.
**Input**: `.spec/project.md` Phase 6 ("Week and Day views") and the runtime shape (`CalendarViewMachine` → Month | Week | Day). `.spec/project.md` still lists Phases 3–5 as deferred. Phases 3, 4, and 5 are implemented (T027–T031, T032–T035, T036–T039). Trust `.spec/specifications/03-weather-engine.md`, `.spec/specifications/04-layout-widgets.md`, `.spec/specifications/05-month-view.md`, and `.spec/tasks/05-month-tasks.md`.
**Constitution check**: Principle I (primary layout 1180×820, the same layout fills 1366×1024 and 1920×1080, zero document scroll, contained vertical scroll only inside the week time grid with `overscroll-behavior: contain`, 44×44pt targets), Principle II (no PIN, ICS URL, or lat/lon added to the client; events stay `UnifiedEvent` without `icsUrl`), Principle III (reuse the existing calendar SWR hook, no `setInterval`, no idle lock, no idle view-reset)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (`UnifiedEvent`, `CalendarViewState`, `weekStartDay` default `0`), `.spec/specifications/02-calendar-engine.md` (`CalendarApiResponse` only — do not change the engine or the route), `.spec/specifications/05-month-view.md` (the month grid this phase navigates from). Do not reopen the PIN-gate, calendar engine, weather engine, clock, weather widget, month-grid geometry, or `LockControl` unless they are broken.

This specification adds week view and day view. From the month grid, a tap opens that day. Week view opens only from that day, and it is the only surface allowed to scroll, and only inside its time grid. Events come from the existing `GET /api/calendar` SWR hook (`CalendarApiResponse`). Week start stays Sunday when `WEEK_START_DAY=0`. The header row and the lock control stay as they are after Phase 5. The filter bar and the idle view-reset are out of scope.

## How you move between views

The month grid has no Week control. Week view is the second step.

```text
Month grid  --tap a day cell-->  Day view  --tap Week-->  Week view
                                    |                       |
                                    +-------- Month --------+

Week view  --tap a day heading (the date number)-->  Day view of that date
```

Example, for Tuesday 22 September 2026 in `America/New_York`: tap the 22nd on the month grid and the main region becomes that day. Tap Week and the main region becomes Sunday the 20th through Saturday the 26th. Those dates are an illustration, not hardcoded. Tap Month from either view and the 4-week grid returns, still anchored on today.

## What week view looks like

Same header as month and day: clock on the left, current weather and the 3-day forecast on that row, lock at the far right (hidden in demo mode). Under the header, the main region is a week planner. The sketch below uses the week of 20 September 2026 so the columns are concrete. Any other week uses that week's own dates.

```text
[ Month ]

Sun     Mon     Tue     Wed     Thu     Fri     Sat
20      21      22      23      24      25      26
        [ all-day chips in one short band — this band does not scroll ]

 7 AM |       |       |       |       |       |       |
 8 AM |       |       |       |       |       |       |
 9 AM |       |       |Standup|       |       |       |
10 AM |       |       |Deep   |       |       |       |
 ...  |       |       |       |       |       |       |
      +------- only this hour grid scrolls up and down -------+
```

- Seven columns. Column 0 is Sunday when `weekStartDay` is `0`. The date number is a button. Today’s column is marked the same way today’s month cell is marked.
- The short band under the dates holds all-day events (title and calendar color). It does not scroll. Extra chips clip.
- The hour grid is midnight through 11 PM, one row per hour, with the hour written in the gutter (`7 AM` on the default 12-hour clock). Timed events sit in the column of their day at the height of their start time. "Standup" on Tuesday sits on the 9 AM row of Tuesday’s column.
- A finger or wheel moves that hour grid only. The document, the header, the day names, and the all-day band stay put. The grid uses `overscroll-behavior: contain`.
- On open, the grid is already scrolled near the current hour when this week contains today, and near 7 AM otherwise. It does not chase the clock after that.

Day view, for comparison, is not a grid. It is the one date, a Month button, a Week button, then a vertical list of that day’s events. That list does not scroll.

## Layout sizes

1180×820 is the primary design size (iPad Air 2020 landscape). It is not a permanent card. The sizes already defined are:

| Viewport | What the dashboard does |
|----------|-------------------------|
| **1180×820** | Fills the viewport at 1:1. This is the primary check. |
| **1366×1024** and **1920×1080** | Fills the viewport. Header stays one row. Month rows, week columns, and the day list grow with the extra space. |
| Smaller than 1180×820 on either edge | The 1180×820 layout scales down to fit. |

The current `.kiosk-stage` rule `scale(min(1, …))` pins every larger window to a centered 1180×820 island so the primary size can be inspected on a big monitor. That cap is a test aid, not the product. This phase removes it.

- When the frame is at least 1180×820 on both edges, `.kiosk-stage` is `width: 100%` and `height: 100%` with no scale transform. Month, day, and week fill that stage (`h-full min-h-0`). Extra width and height go into the calendar, not into a margin around a fixed rectangle.
- When either edge is below the primary size, `.kiosk-stage` is a 1180×820 box scaled by `min(100cqw / 1180px, 100cqh / 820px)` and centered. `html` and `body` stay `overflow: hidden`.
- Setting the browser to 1180×820 is how the primary size is tested. At that size the stage matches the viewport, so the old scale cap is not required for the check.

Header row and lock placement do not change: clock on the left; current weather and the 3-day forecast on that same row; `LockControl` at the far right, hidden in demo mode. Month cells are not buttons yet. This phase makes each day cell a button that opens that day. The 4×7 geometry, today mark, and title-plus-color chips stay.

## User Scenarios & Testing

### User Story 1 — A tap on a month day opens that day (Priority: P1)

The month grid is still the view at `/`. Each day cell is a button. Tapping it replaces the grid with that dashboard date. A Month control on the day view returns to the 4-week grid, still anchored on today.

**Why this priority**: The month grid already shows the wall. Phase 6's job is to open one of those days without leaving the stage.

**Independent Test**: In demo mode at 1180×820, tap today's cell. The main region shows that `America/New_York` date and a Month control. Activate Month. The 4-week grid is back, today's cell is still marked, and the document has not scrolled.

**Acceptance Scenarios**:

1. **Given** the month grid, **When** it renders, **Then** each of the 28 day cells is a `button` of type `button` whose accessible name includes that cell's dashboard date. The cell is the hit target and is at least 44×44pt. Chips inside the cell are not separate links or buttons. The 4-week span, Sunday-first columns when `weekStartDay` is `0`, today mark, and clipped chips behave as they do after Phase 5.
2. **Given** a day cell whose dashboard date is `YYYY-MM-DD`, **When** it is activated, **Then** the main region switches to day view for that key. `CalendarViewState.mode` is `"day"`, `selectedDay` and `anchorDate` are that key, and `selectedWeekStart` is the `YYYY-MM-DD` of `getWeekBounds` for that date using the `weekStartDay` prop and the `timezone` prop. The month grid unmounts.
3. **Given** day view, **When** Month is activated, **Then** `mode` is `"month"` and the existing 4-week grid renders, still computed from today in `timezone`, not from `selectedDay`.
4. **Given** any of these transitions, **When** the stage is 1180×820, **Then** the header row is unchanged and `document.documentElement` does not gain a scrollbar. The machine does not read `idleTimeoutMs` and does not navigate on a timer.

---

### User Story 2 — Day view lists that day's events (Priority: P1)

Day view reads the same `CalendarApiResponse` the month grid already uses. It shows the events that overlap the selected day: all-day events first, then timed events with a clock range. A day with no events says so. A failed fetch says the calendar is unavailable and still offers Month.

**Why this priority**: Opening a day is only useful if the events on that cell become readable at a glance.

**Independent Test**: Tap today in demo mode. "Standup" is listed with a time range formatted in `America/New_York` and a `#6366f1` color mark. "Early release" is not on today. Description text from the payload is not shown. The day view does not scroll.

**Acceptance Scenarios**:

1. **Given** day view, **When** it loads events, **Then** it uses the existing `useCalendar` hook (`GET /api/calendar`, `Accept: application/json`, `refreshInterval` 600_000, `CalendarApiResponse`). It does not add a query string, a second fetcher, or a new SWR key.
2. **Given** an `events` array, **When** the day paints, **Then** an event is included when `Date.parse(startTime) < dayBounds.end` and `Date.parse(endTime) > dayBounds.start`, using `getDayBounds(selectedDayAtNoon, timezone)`. `isAllDay === true` events render in an all-day group, labeled "All day", without a clock range. Other events render after that group, ordered by `startTime` then `id`, each with `formatTime` start and end in the `timeFormat` prop (default 12-hour, so AM/PM is visible). Each row shows `title`, `calendarColor` as a left border or swatch on a dark row, `calendarLabel`, and `location` when `location` is non-empty. `description` is omitted.
3. **Given** the selected day overlaps no events, **When** `events` is an array, **Then** the date heading stays and the body says "No events". **Given** a fetch error and no `events` array, **When** the view settles, **Then** it says "Calendar unavailable" and Month still works. **Given** `stale: true` or a non-empty `errors` array alongside `events`, **When** the day renders, **Then** it shows those events.
4. **Given** day view, **When** the viewport is 1180×820, **Then** the view fills the main region with `overflow: hidden`. It does not set `overflow` to `auto` or `scroll`. Extra rows clip inside the stage.

---

### User Story 3 — Week view is the hour grid for the open day (Priority: P1)

Week view is opened by tapping Week on day view. It shows the picture in "What week view looks like": seven day columns for the week that contains `selectedDay`, an all-day band that does not scroll, and a 24-hour grid that does. Tapping a date number opens that day. Month returns to the 4-week grid.

**Why this priority**: Constitution I allows contained vertical scroll in exactly one place: the week time grid. This phase is that place.

**Independent Test**: From today's day view, activate Week. Seven columns appear, the first headed by the Sunday of this week in `America/New_York`. The time grid's scroll height exceeds its own box; scrolling it does not scroll the document. `overscroll-behavior` on that grid is `contain`. Activate the heading for today. Day view for today is back, including "Standup".

**Acceptance Scenarios**:

1. **Given** day view, **When** Week is activated, **Then** `mode` is `"week"` and `anchorDate` is `selectedWeekStart`. The week shows seven dashboard dates beginning at that key, stepped with `getWindowStart`. Weekday labels are `en-US` `weekday: "short"` in `timezone`. The column for today is marked with the same today treatment as a month cell. Each day heading is a button at least 44×44pt.
2. **Given** the week, **When** events are placed, **Then** overlap uses the same half-open `getDayBounds` test as day view. `isAllDay` events render in a fixed-height band above the time grid (one truncated title, `calendarColor` on a dark chip). That band uses `overflow: hidden` and does not scroll. Timed events render in the day column, clamped to that dashboard day: a spill from the previous day starts at midnight, a spill into the next day ends at the following midnight. They are ordered by `startTime` then `id`.
3. **Given** the time grid, **When** it is laid out, **Then** it is 24 hour rows of 48px (1152px of content) plus an hour gutter. Hour labels use `formatTime` and `timeFormat` at minute 00. Each timed event is absolutely positioned from its zoned start minute and its duration, with a minimum block height of 22px, a truncated `title`, and `calendarColor` as a left border or swatch on a dark block. Zoned hour and minute come from `Intl` with the `timezone` prop. The grid scrolls on the vertical axis only (`overflow-y: auto`, `overflow-x: hidden`, `overscroll-behavior: contain`). No other element in the stage, including the document, the header, the day headings, the all-day band, and day view, uses `overflow: auto` or `overflow: scroll`.
4. **Given** the week contains today, **When** the time grid mounts, **Then** it sets `scrollTop` once so the current zoned hour sits one row below the top of the scroller when that hour is not 0. **Given** the week does not contain today, **When** the grid mounts, **Then** it sets `scrollTop` once to hour 7 (7:00). It does not follow the clock after that, and it does not use `setInterval`.
5. **Given** a week day heading, **When** it is activated, **Then** day view opens for that column's `YYYY-MM-DD` (`selectedDay` and `anchorDate` update; `selectedWeekStart` stays the week already on screen). **Given** Week's Month control, **When** it is activated, **Then** the 4-week month grid returns, anchored on today.

---

### Edge Cases

- **PIN-gate**: Already implemented. This phase MUST NOT edit `middleware.ts`, `/unlock`, or the auth routes.
- **Calendar engine**: Do not change `UnifiedEvent`, `CalendarApiResponse`, the −7 / +45 window, cache TTL, `useCalendar`, or `app/api/calendar/route.ts`. Views only consume the existing envelope.
- **Header**: Do not edit `DashboardShell.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, or `LockControl.tsx`. Lock stays far right in the header, hidden in demo mode, confirm-then-`POST /api/auth/lock`.
- **Stage**: Do edit the `.kiosk-stage` rule in `globals.css` as specified under Layout sizes. Do not edit the `html` / `body` overflow resets or `.kiosk-frame` (full-size, centered, `overflow: hidden`, `container-type: size`).
- **Month grid**: Do not change the 28-day math, chip contents, clipping, or the today `requestAnimationFrame` loop. The cell element becomes a button and gains `onSelectDay`. Button chrome is reset so the cell still fills its grid track (`text-align` start, `min-h-0`, `overflow: hidden`, inherited font).
- **Date keys**: A `YYYY-MM-DD` key is turned back into a `Date` with `zonedDateTime(year, month, day, 12, 0, 0, timezone)`. Do not use `new Date("YYYY-MM-DD")`, `Date#getDay()`, or `Date#getHours()` for placement or labels.
- **`WEEK_START_DAY=1`**: Pass `weekStartDay` through. Acceptance is the default `0` (Sunday). Do not hardcode Sunday in a way that ignores the prop.
- **Filter chips**: `activeFilters` stays `[]`. Do not render chips and do not subset `events`.
- **Idle**: `lastInteractionAt` stays `0`. Do not update it, do not read `idleTimeoutMs`, and do not return to month view on a timer. Phase 8 owns that.
- **Empty, loading, stale**: Loading keeps the day or week chrome and does not grow the stage. `events: []` is an empty day or an empty week, not the unavailable message. Stale or partial `events` still render.
- **Secrets**: New client props are `timeFormat` plus the `timezone` and `weekStartDay` the month grid already receives. Bundles and the calendar JSON still contain no PIN and no ICS URL.
- **Hit targets**: Month cells, Month, Week, and week day headings are at least 44×44pt. No hover-only affordance. No Framer Motion on these views.

## Requirements

### Functional Requirements — View machine

- **FR-001**: `components/calendar/CalendarViewMachine.tsx` is a Client Component. Props are `timezone: string`, `weekStartDay: 0 | 1`, and `timeFormat: "12h" | "24h"`. It holds a `CalendarViewState` from `lib/types/ui-state.ts`. The initial value is `mode: "month"`, `anchorDate: ""`, `activeFilters: []`, `lastInteractionAt: 0`, with `selectedDay` and `selectedWeekStart` unset. It MUST NOT rewrite that type.
- **FR-002**: The machine renders one of `MonthView`, `DayView`, or `WeekView` for the current `mode`. Transitions are the path in "How you move between views". Month view keeps deriving its 28 days from today.
- **FR-010**: `.kiosk-stage` follows Layout sizes. At 1180×820, 1366×1024, and 1920×1080 the stage fills the frame with no scale transform. Below 1180×820 on either edge, the stage is the 1180×820 box scaled down and centered. The `min(1, …)` cap is removed. `html` / `body` kiosk resets stay.
- **FR-003**: `app/page.tsx` stays a Server Component. It still wraps `DashboardShell` in `.kiosk-frame` / `.kiosk-stage` and still renders `demo ? null : <LockControl />` through the shell `lock` slot. The shell `main` slot becomes `CalendarViewMachine` with `timezone`, `weekStartDay`, and `timeFormat` from `getDashboardConfig()`. Clock and weather props stay the ones Phase 4 and Phase 5 already pass. Do not pass `latitude`, `longitude`, `idleTimeoutMs`, `cacheRevalidateSeconds`, calendar sources, or `icsUrl`.

### Functional Requirements — Month cells

- **FR-004**: `MonthView` gains a required `onSelectDay: (dateKey: string) => void`. Activating a cell calls it with that cell's `YYYY-MM-DD` from `calendarDateParts` in `timezone`. The component otherwise keeps its current data and layout behavior, including `useCalendar`, `overflow: hidden`, and the rAF today loop.

### Functional Requirements — Day view

- **FR-005**: `components/calendar/DayView.tsx` is a Client Component. It receives `timezone`, `timeFormat`, `weekStartDay`, `selectedDay`, `onShowMonth`, and `onShowWeek`. It calls `useCalendar`. It does not import `lib/config.ts`, `lib/calendar-engine.ts`, `lib/calendar-cache.ts`, `lib/weather-engine.ts`, or `lib/weather-cache.ts`.
- **FR-006**: The day toolbar is a row: a Month button (`onShowMonth`), the selected date (`en-US`, `weekday: "long"`, `month: "long"`, `day: "numeric"`, `timeZone` = the prop), and a Week button (`onShowWeek`). Both buttons are at least 44×44pt. The body follows User Story 2 and uses `overflow: hidden`.

### Functional Requirements — Week view

- **FR-007**: `components/calendar/WeekView.tsx` is a Client Component. It receives `timezone`, `timeFormat`, `weekStartDay`, `selectedWeekStart`, `onShowMonth`, and `onSelectDay`. It calls `useCalendar` and the same import ban as day view.
- **FR-008**: Composition, top to bottom, inside the existing main slot: Month button; seven day-heading buttons; the all-day band; the time grid scroller. The scroller is the only overflow other than `hidden`. It uses `overflow-y: auto`, `overflow-x: hidden`, and `overscroll-behavior: contain`. Hour math and the one-time `scrollTop` follow User Story 3. Zoned clock parts use `Intl` with `timezone` and `hourCycle: "h23"`.
- **FR-009**: `lib/date-utils.ts` exports keep their current signatures. This phase calls `getWeekBounds`, `getDayBounds`, `getWindowStart`, `zonedDateTime`, `formatTime`, and `calendarDateParts`. It does not edit that file.

### Key Entities / Data Contracts

No new response types. Views consume the Phase 2 envelope and the Phase 1 event. `icsUrl` MUST NOT appear on either.

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

export interface CalendarViewState {
  mode: "month" | "week" | "day";
  anchorDate: string; // "YYYY-MM-DD"
  selectedWeekStart?: string;
  selectedDay?: string;
  activeFilters: string[];
  lastInteractionAt: number;
}
```

This phase reads `id`, `title`, `calendarLabel`, `calendarColor`, `location`, `startTime`, `endTime`, and `isAllDay`. It does not display `description` or `calendarCategory`. `activeFilters` stays empty. `lastInteractionAt` stays `0`.

### Shell composition

```text
app/page.tsx (server)
  .kiosk-frame
    .kiosk-stage
      fills the frame at 1180×820 and at the larger defined sizes
      scales the 1180×820 box down only when a window edge is smaller
  DashboardShell
    header: ClockWidget | WeatherWidget | LockControl (unchanged row)
    main: CalendarViewMachine
      month → MonthView (tap a day cell → that day)
      day   → DayView (Month | that date | Week)
      week  → WeekView (tap Week on the day; hour grid scrolls)
```

PIN-gate, `/api/calendar`, and `/api/weather` stay as they are. The shell does not start an idle timer and does not mount a filter bar.

## Success Criteria

- **SC-001**: At 1180×820, tapping a month day opens day view for that dashboard date, and Month returns to the today-anchored 4-week grid. The document does not scroll. At 1366×1024 and 1920×1080 the stage fills the viewport (no centered 1180×820 island) and the document still does not scroll. A window smaller than 1180×820 on either edge scales the primary layout down.
- **SC-002**: Today's day view in demo mode lists "Standup" with a 12-hour time range and calendar color `#6366f1`. An empty in-range day says "No events". A failed fetch says "Calendar unavailable".
- **SC-003**: Week view is reached only by tapping Week on a day. It shows seven days starting Sunday under default config, an all-day band that does not scroll, and an hour grid that does. That grid’s `overscroll-behavior` is `contain`. Scrolling it leaves the document scroll position at 0. Tapping a date number opens that day.
- **SC-004**: The header row and `LockControl` behavior are unchanged. Demo mode hides the lock control. `.kiosk-stage` fills the frame at the three defined sizes and scales down only below 1180×820.
- **SC-005**: No filter chips and no idle view-reset. `activeFilters` is `[]` and `lastInteractionAt` is `0` for the life of this phase.
- **SC-006**: Client props and bundles add no PIN, no ICS URL, and no latitude/longitude. `icsUrl` is absent from the calendar JSON. `useCalendar` is still the only calendar fetch.

## Assumptions

- The header row (clock, weather and forecast, lock at the far right) is the layout source of truth. The centered 1180×820 island is only the current test cap. Older sentences in `.spec/tasks/05-month-tasks.md` that put the lock at the bottom left are stale.
- `useCalendar` is already deduped by SWR on `/api/calendar`. Mounting it from whichever view is visible reuses that cache. This phase does not lift the hook.
- `formatTime`, `getWeekBounds`, `getDayBounds`, `getWindowStart`, `zonedDateTime`, and `calendarDateParts` are client-safe. No new package.
- Default config remains `America/New_York`, `weekStartDay` `0`, and `timeFormat` `12h`.
- The API window (−7 / +45) already covers the visible week and the selected day. This phase does not request a custom range.
- Demo `generateDemoEvents()` already includes "Standup" on today with `calendarColor` `#6366f1`. This phase does not edit that generator.
- A 48px hour row makes the time grid taller than the main region under the header, so the contained scroller has somewhere to scroll at 1180×820.

## Out of Scope (this specification)

- Filter bar and any client-side subset of `UnifiedEvent[]` (Phase 7)
- Idle view-reset back to month view (Phase 8), including writing `lastInteractionAt` or reading `IDLE_TIMEOUT_MS`
- Changes to the PIN-gate, `LockControl`, the clock, the weather widget, `DashboardShell`, the `html` / `body` kiosk resets, the calendar engine, the weather engine, or `useCalendar`
- Rewriting the month grid beyond the cell button and `onSelectDay`
- Event description on day or week rows
- Creating or editing events
- A current-time line on the week grid
- Perpetual Framer Motion

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | 1180×820 is the primary check and fills that viewport; 1366×1024 and 1920×1080 fill those viewports too; smaller windows scale the primary layout down; document scroll stays zero; the only scroller is the week time grid with `overscroll-behavior: contain`; new controls are at least 44×44pt |
| II Privacy | Client gains `timeFormat` only, beside the display props already on the page; calendar JSON is the existing envelope; no `icsUrl`, PIN, or coordinates |
| III Appliance | Existing 600s SWR hook, no `setInterval`, no idle timer, no session lock, last-known events or an explicit unavailable line |
