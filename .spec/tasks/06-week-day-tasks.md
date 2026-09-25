# Tasks: Week View and Day View

**Input**: `.spec/specifications/06-week-day-views.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 6 (week and day views). Phases 3, 4, and 5 are already implemented (T027–T031, T032–T035, T036–T039). Ignore the stale "Phase 3 deferred", "Phase 4 deferred", and "Phase 5 deferred" rows in `.spec/project.md`.
**Status**: Review complete 2026-09-25. Implemented 2026-09-22. T040–T043 complete. Do not start Phase 7 until a new chat explicitly asks for it.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before Phase 7.

**Organization**: One implementation slice (Phase 6). PIN-gate, calendar
engine, weather engine, clock, weather widget, month-grid geometry, and
`LockControl` already exist — do not revisit them unless they are broken.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US3]**: Maps to user stories in the specification
- Step IDs (`6.1` … `6.4`) are this phase's plan steps
- Task IDs continue from Phase 5 (`T039`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). `app/page.tsx`
stays a Server Component. `CalendarViewMachine`, `MonthView`, `DayView`,
and `WeekView` are Client Components. They MUST NOT import `lib/config.ts`
or any server engine/cache module. `lib/date-utils.ts` and
`lib/hooks/useCalendar.ts` may be imported; do not change their exports.

The header to preserve is the one in the tree now. The older
bottom-left lock sentences in `.spec/tasks/05-month-tasks.md` are
stale. The centered 1180×820 island is a test cap, not the product:

- Header row: clock, then current weather and the 3-day forecast, then
  `LockControl` at the far right (omitted in demo mode).
- 1180×820 fills that viewport and is the primary check. 1366×1024 and
  1920×1080 fill those viewports too (the calendar grows). A window
  smaller than 1180×820 on either edge scales the 1180×820 layout down.
  Zero document scroll.

**Do not start Phase 7 (filter bar) in the same chat as this implementation.**

---

## Phase 6: Week View and Day View

**Purpose**: From the month grid, a tap opens that day. Week is the
next tap: the Week button on that day. It shows that day's
Sunday-start week as seven columns, an all-day band, and a 24-hour
grid. Contained vertical scroll exists only in that hour grid.

**Goal**: `/` keeps the header row. The stage fills 1180×820,
1366×1024, and 1920×1080, and scales down only when a window edge is
under 1180×820. Day and week views read `GET /api/calendar` through the
existing `useCalendar` hook (`CalendarApiResponse`). No filter bar and
no idle view-reset.

- [x] T040 [P] [US2] Step 6.1 — Implement `components/calendar/DayView.tsx`
      as a Client Component. Props: `timezone: string`,
      `timeFormat: "12h" | "24h"`, `weekStartDay: 0 | 1`,
      `selectedDay: string` (`YYYY-MM-DD`), `onShowMonth: () => void`,
      `onShowWeek: () => void`. Call `useCalendar` from
      `lib/hooks/useCalendar.ts`. Do not add a query string or another
      fetcher. Do not import `lib/config.ts`, `lib/calendar-engine.ts`,
      `lib/calendar-cache.ts`, `lib/weather-engine.ts`, or
      `lib/weather-cache.ts`. Parse `selectedDay` with
      `zonedDateTime(year, month, day, 12, 0, 0, timezone)` from
      `lib/date-utils.ts`. Include an event when
      `Date.parse(startTime) < getDayBounds(thatDate, timezone).end` and
      `Date.parse(endTime) > getDayBounds(thatDate, timezone).start`.
      Toolbar: Month button calling `onShowMonth`, the date in `en-US`
      (`weekday: "long"`, `month: "long"`, `day: "numeric"`, `timeZone`),
      Week button calling `onShowWeek`. Both buttons are at least
      44×44pt. Render `isAllDay` events first as "All day" with `title`,
      `calendarLabel`, `calendarColor` on a dark row, and `location` when
      it is non-empty. Then timed events ordered by `startTime` then
      `id`, with `formatTime` start and end. Omit `description`. `events`
      that miss this day show "No events". A fetch error with no `events`
      array shows "Calendar unavailable". `stale: true` or feed errors
      with an `events` array still render those events. The root uses
      `overflow: hidden` and MUST NOT use `overflow: auto` or `scroll`.
      Do not edit `lib/date-utils.ts` or `lib/hooks/useCalendar.ts`.
      File: `components/calendar/DayView.tsx`.
- [x] T041 [P] [US3] Step 6.2 — Implement `components/calendar/WeekView.tsx`
      as a Client Component. Props: `timezone`, `timeFormat`,
      `weekStartDay`, `selectedWeekStart: string`, `onShowMonth`, and
      `onSelectDay: (dateKey: string) => void`. Same `useCalendar` and
      import rules as T040. Build seven dates from `selectedWeekStart`
      via `zonedDateTime` at 12:00 and `getWindowStart`. Labels are
      `en-US` `weekday: "short"` in `timezone`. Mark the column whose
      key equals today in `timezone`. Each day heading is a button at
      least 44×44pt that calls `onSelectDay` with that column's
      `YYYY-MM-DD`. Place events with the same `getDayBounds` overlap
      test as T040. `isAllDay` chips go in a fixed-height band
      (`overflow: hidden`, no scroll): truncated `title`, `calendarColor`
      on a dark chip. Timed events go in a 24×48px hour grid (1152px),
      clamped to the column's dashboard midnight-to-midnight, minimum
      block height 22px, truncated `title`, dark block, `calendarColor`
      border or swatch. Read zoned hour and minute with `Intl` and
      `timezone` (`hourCycle: "h23"`). Do not use `Date#getHours()` or
      `new Date("YYYY-MM-DD")`. Hour gutter labels use `formatTime` at
      minute 00. The time grid is the only scroller:
      `overflow-y: auto`, `overflow-x: hidden`,
      `overscroll-behavior: contain`. On mount, set `scrollTop` once to
      `(currentZonedHour - 1) * 48` when this week contains today and
      the hour is not 0, otherwise to `7 * 48`. Do not follow the clock
      and do not use `setInterval`. A Month button (at least 44×44pt)
      calls `onShowMonth`. Loading keeps the chrome. Error with no
      `events` array shows "Calendar unavailable". File:
      `components/calendar/WeekView.tsx`.
- [x] T042 [US1] [US2] [US3] Step 6.3 — Wire navigation without moving
      the shell. Add required `onSelectDay: (dateKey: string) => void`
      to `components/calendar/MonthView.tsx`. Change each day cell from
      a `div` to `<button type="button">` that calls `onSelectDay` with
      that cell's `YYYY-MM-DD`. Reset button chrome so the cell still
      fills its track (`text-left`, `min-h-0`, `overflow-hidden`,
      inherited font). Keep the 28-day math, chips, today mark, clipping,
      and `requestAnimationFrame` loop. Add
      `components/calendar/CalendarViewMachine.tsx`, a Client Component
      holding `CalendarViewState` from `lib/types/ui-state.ts`: initial
      `mode: "month"`, `anchorDate: ""`, `activeFilters: []`,
      `lastInteractionAt: 0`. Do not rewrite that type. Do not write
      `lastInteractionAt` and do not read `idleTimeoutMs`. Render
      `MonthView`, `DayView`, or `WeekView` for `mode`. Cell tap sets
      `mode: "day"`, `selectedDay` and `anchorDate` to that key, and
      `selectedWeekStart` to the `YYYY-MM-DD` of
      `getWeekBounds(zonedDateTime(y, m, d, 12, 0, 0, timezone), weekStartDay, timezone).start`.
      Day's Week sets `mode: "week"` and `anchorDate` to
      `selectedWeekStart`. Day's Month and Week's Month set
      `mode: "month"`. A week day heading sets `mode: "day"`,
      `selectedDay` and `anchorDate` to that key, and leaves
      `selectedWeekStart` unchanged. `activeFilters` stays `[]`. Update
      `app/page.tsx` so `main` is `CalendarViewMachine` with `timezone`,
      `weekStartDay`, and `timeFormat` from `getDashboardConfig()`. Keep
      the clock props, the weather props, and
      `demo ? null : <LockControl />`. Do not pass latitude, longitude,
      `idleTimeoutMs`, calendar sources, or `icsUrl`. In `app/globals.css`,
      change only `.kiosk-stage`: when the frame is at least 1180×820 on
      both edges, the stage is `width: 100%` and `height: 100%` with no
      scale transform; when either edge is smaller, the stage is a
      1180×820 box scaled by `min(100cqw / 1180px, 100cqh / 820px)` and
      centered. Remove the `min(1, …)` cap. Leave `.kiosk-frame` and the
      `html` / `body` overflow resets as they are. Month, day, and week
      roots fill the stage (`h-full min-h-0`) so the extra space at
      1366×1024 and 1920×1080 goes into the calendar. Do not edit
      `DashboardShell.tsx`, `LockControl.tsx`, `ClockWidget.tsx`,
      `WeatherWidget.tsx`, `middleware.ts`, `lib/date-utils.ts`,
      `lib/hooks/useCalendar.ts`, or either API route. Files:
      `components/calendar/MonthView.tsx`,
      `components/calendar/CalendarViewMachine.tsx`, `app/page.tsx`,
      `app/globals.css`.
- [x] T043 [US1] [US2] [US3] Step 6.4 — Verification only (no new product
      files). Run the app and check `/` in the browser at 1180×820
      landscape per the gate below. Also confirm 1366×1024 and
      1920×1080 fill the viewport with no document scroll and no
      centered 1180×820 island. Do not start the filter bar or the idle
      view-reset.

### Phase 6 Verification

`/` keeps the header row. The stage fills the viewport at 1180×820
and at the two larger defined sizes. A month-day tap opens that day.
Week opens from the Week button on that day and scrolls only its hour
grid. Month returns to the today-anchored 4-week grid.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Viewport 1180×820 | Browser at 1180×820: no document scrollbar; document `scrollHeight` does not exceed the layout viewport; background `#0a0a0f`; the stage fills that viewport |
| Larger sizes | At 1366×1024 and 1920×1080 the stage fills the viewport. There is no centered 1180×820 island and no scale cap. Document still does not scroll. A window smaller than 1180×820 on either edge scales the primary layout down |
| Month tap | Each day cell is a `button`. Activating today opens day view for today's `America/New_York` date. Month returns to 4 rows × 7 columns, Sunday first, today marked |
| Day events | The same `GET /api/calendar` JSON feed is used. Today includes "Standup" with a 12-hour range and `#6366f1`. Description is absent. An empty day says "No events". The day view has no scrollbar |
| Week path | Week is not on the month grid. Open a day, then activate Week. Seven columns start on that week's Sunday. Date numbers sit on the columns. An all-day band does not scroll. The hour grid under it does |
| Week scroll | The time grid `scrollHeight` is greater than its client height. Its computed `overscroll-behavior` is `contain` and its vertical overflow scrolls. Scrolling it leaves document scroll at 0. Day headings, the all-day band, the header, and the document do not scroll |
| Week to day | Activating today's week heading opens that day, including "Standup" |
| Unavailable | A failed calendar fetch shows "Calendar unavailable" without scrolling the document or removing the header |
| Lock and header | Demo mode: no "Lock dashboard" button. Clock, current weather, and the 3-day forecast stay on one header row. `LockControl.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, and `DashboardShell.tsx` unchanged |
| Idle and filters | No filter chips. No timer returns the view to month. `idleTimeoutMs` is not passed into the machine. `lastInteractionAt` is not updated |
| Secrets | Client props do not include latitude, longitude, PIN, `idleTimeoutMs`, or any ICS URL. `icsUrl` is absent from the calendar JSON |
| Untouched | `middleware.ts`, calendar route, weather route, `lib/date-utils.ts`, `lib/hooks/useCalendar.ts`, `.kiosk-frame`, and the `html` / `body` overflow resets unchanged. `.kiosk-stage` no longer uses `scale(min(1, …))` |

**Do not start Phase 7 (filter bar) until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phases 1, 1.5, 2, 3, 4, and 5 complete (kiosk stage, header row, `LockControl`, `GET /api/calendar` as `CalendarApiResponse`, `useCalendar`, `MonthView`, date helpers).
- **T040**: Day view component. No dependency on T041.
- **T041**: Week view component. No dependency on T040.
- **T042**: Depends on T040 and T041 (the machine mounts both) and on the existing `MonthView`.
- **T043**: Depends on T042.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Tap a month day to open it, Month returns | T042, T043 | T043 at 1180×820; cell is a button; day date matches the cell; Month restores the 4-week grid |
| US2 Day lists `CalendarApiResponse` events | T040, T042, T043 | T043 shows "Standup" on today with a time and color |
| US3 Week time grid, contained scroll | T041, T042, T043 | T043 scrolls the time grid without moving the document |

### Parallel Opportunities

```text
After spec approval + "implement Phase 6":
  T040 (DayView) and T041 (WeekView) in parallel
  then T042 (month cell buttons, CalendarViewMachine, page wiring)
  then T043 (browser verification at 1180×820)
```

T040 and T041 touch different files and do not import each other.

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/06-week-day-views.md`.
2. Execute T040–T043 only after the explicit instruction
   **implement Phase 6**. Approval of these two files is not that
   instruction.
3. Run Phase 6 Verification in the browser at 1180×820 → stop if any
   check fails.
4. Stop. Do not implement the filter bar or the idle view-reset.

### MVP increment for this feature

US1 (tap a day, land on that date, return to the month grid) is the
smallest visible slice. US2 and US3 are required before calling Phase 6
complete: the day must show its events, and the week time grid is the
constitution's only scroll container.

---

## Notes

- Month cells become buttons in this phase. Chips stay non-interactive
  content inside the cell button.
- Overlap matches the month grid: `startTime < dayEnd` and
  `endTime > dayStart` from `getDayBounds` in the dashboard timezone.
- Turn `YYYY-MM-DD` into a `Date` with `zonedDateTime` at 12:00 in
  `timezone`. Do not parse it with `new Date("YYYY-MM-DD")`.
- Calendar polling stays on the existing hook (600s, no query
  parameters).
- Contained scroll is `overflow-y: auto` plus `overscroll-behavior:
  contain` on the week time grid only.
- Do not revisit the PIN-gate, calendar engine, weather engine, clock,
  weather widget, month-grid geometry, or `LockControl` unless a Phase 6
  change regresses them.
- Browser verification is part of T043. A screenshot of either view is
  not enough; confirm the document does not scroll and that scrolling
  the week time grid does not move the document.
