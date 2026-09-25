# Tasks: Rolling 4-Week Month View

**Input**: `.spec/specifications/05-month-view.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 5 (month view, 4-week rolling). Phases 3 and 4 are already implemented (T027–T031 and T032–T035). Ignore the stale "Phase 3 deferred" and "Phase 4 deferred" rows in `.spec/project.md`.
**Status**: Review complete 2026-09-25. Implemented 2026-09-22. T036–T039 complete. Do not start Phase 6 until a new chat explicitly asks for it.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before Phase 6.

**Organization**: One implementation slice (Phase 5). PIN-gate, calendar
engine, weather engine, clock, weather widget, and `LockControl` already
exist — do not revisit them unless they are broken.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US2]**: Maps to user stories in the specification
- Step IDs (`5.1` … `5.4`) are this phase's plan steps
- Task IDs continue from Phase 4 (`T035`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). `app/page.tsx`
stays a Server Component. `MonthView` and `useCalendar` are Client
Components. They MUST NOT import `lib/config.ts` or any server
engine/cache module. `lib/date-utils.ts` may be imported; do not change
its existing exports.

**Do not start Phase 6 (week and day views) in the same chat as this implementation.**

---

## Phase 5: Rolling 4-Week Month View

**Purpose**: Fill the empty main under the Phase 4 header with a 4-week
grid anchored on today, week starting Sunday (`WEEK_START_DAY=0`), inside
the 1180×820 bound with zero document scroll.

**Goal**: `/` shows event titles and calendar colors from
`GET /api/calendar` (`CalendarApiResponse` via SWR). Clock, weather
widget, and bottom-left `LockControl` (hidden in demo mode) stay. No
week view, day view, filter bar, or idle view-reset.

- [x] T036 [US2] Step 5.1 — Implement `lib/hooks/useCalendar.ts` as a
      client hook. SWR fetches `/api/calendar` with
      `Accept: application/json`, parses `CalendarApiResponse` from
      `lib/types/calendar.ts`, throws on non-OK, and sets
      `refreshInterval` to `600_000`. Do not import `lib/config.ts`,
      `lib/calendar-engine.ts`, `lib/calendar-cache.ts`,
      `lib/weather-engine.ts`, or `lib/weather-cache.ts`. Do not edit
      the calendar route. File: `lib/hooks/useCalendar.ts`.
- [x] T037 [US1] [US2] Step 5.2 — Implement
      `components/calendar/MonthView.tsx` as a Client Component. Props:
      `timezone: string` and `weekStartDay: 0 | 1`. Build 4 rows × 7
      columns starting at `getWeekBounds(today, weekStartDay, timezone).start`,
      stepping with `getWindowStart` from `lib/date-utils.ts` (28 days).
      Weekday labels are `en-US` `weekday: "short"` from those dates
      (Sunday first when `weekStartDay` is `0`). Show each cell's
      day-of-month in the dashboard timezone and mark today. Recompute
      today with `requestAnimationFrame`; `setState` only when the zoned
      `YYYY-MM-DD` changes; `cancelAnimationFrame` on unmount. Do not use
      `setInterval` or `Date#getDay()` for placement. Read `useCalendar`.
      Draw an event on day D when `startTime < D.end` and
      `endTime > D.start` via `getDayBounds`. In-cell order is
      `startTime` then `id`. Each chip is one truncated `title` plus
      `calendarColor` as a left border or swatch on a dark chip. Chips
      are not links or buttons. Do not render description, location, or
      a clock time. Clip overflow (`overflow: hidden` on the grid and
      on each cell); no `overflow: auto` or `scroll`, and no "+N"
      control. Loading still shows the 28 day numbers. A fetch error
      with no `events` array shows "Calendar unavailable". `stale: true`
      or feed errors with an `events` array still render those events.
      `events: []` shows day numbers and no chips. Do not edit
      `lib/date-utils.ts`. File: `components/calendar/MonthView.tsx`.
- [x] T038 [US1] [US2] Step 5.3 — Mount the grid in the existing shell.
      Add a `main` slot to `components/layout/DashboardShell.tsx` and
      render it in the current `min-h-0 flex-1` region with
      `overflow-hidden`. Keep the header (clock start, weather end).
      Update `app/page.tsx` so the server page passes
      `timezone` and `weekStartDay` from `getDashboardConfig()` into
      `MonthView`, and still passes only the existing props to
      `ClockWidget` and `WeatherWidget`. Still render
      `demo ? null : <LockControl />`. Do not pass latitude, longitude,
      `idleTimeoutMs`, calendar sources, or `icsUrl`. Fill the existing
      fixed body (`h-full min-h-0`); do not add a nested `h-dvh` /
      `100dvh` box. The month grid MUST NOT use a z-index ≥ 20 (the
      lock control stays `z-20`). Do not edit `LockControl.tsx`,
      `ClockWidget.tsx`, `WeatherWidget.tsx`, `middleware.ts`,
      `globals.css` kiosk resets, or either API route. Files:
      `components/layout/DashboardShell.tsx`, `app/page.tsx`.
- [x] T039 [US1] [US2] Step 5.4 — Verification only (no new product
      files). Run the app and check `/` in the browser at 1180×820
      landscape per the gate below. Also confirm 1366×1024 and
      1920×1080 have no document scroll. Do not start week view, day
      view, the filter bar, or the idle view-reset.

### Phase 5 Verification

`/` keeps the Phase 4 header and adds a 4-week month grid in the main:
Sunday-start, anchored on today, event title and calendar color, zero
document scroll at 1180×820. Lock, clock, and weather behavior are
unchanged.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Viewport 1180×820 | Browser at 1180×820 landscape: no document scrollbar; `scrollHeight` of the document does not exceed the visual viewport; background `#0a0a0f`; no scrollbar on the grid or a day cell |
| Scale-up | 1366×1024 and 1920×1080 likewise have no document scroll and no cropped header or grid |
| Grid | Exactly 4 week rows and 7 columns. Default config: first column Sunday, labels Sun–Sat, first day is the Sunday of the current `America/New_York` week, today is marked and lies on the 28-day span |
| Events | SWR request is `GET /api/calendar` with JSON accept. In-range demo events show `title` and `calendarColor` (today includes "Standup" with `#6366f1`). Events outside the 28 days are absent. Chips are not links or buttons |
| Clip | A day with several events clips inside the cell. The page and the cell do not scroll |
| Unavailable | A failed calendar fetch shows "Calendar unavailable" and the clock, weather, and day grid remain inside the viewport |
| Date roll | `MonthView.tsx` uses `requestAnimationFrame` and has no `setInterval`. Placement does not use `Date#getDay()` |
| Lock | Demo mode: no "Lock dashboard" button. Live mode: existing bottom-left `LockControl` still confirm-locks and paints above the grid. File `LockControl.tsx` unchanged |
| Header | Clock and weather widget still render. `ClockWidget.tsx` and `WeatherWidget.tsx` unchanged |
| Secrets | Client props do not include latitude, longitude, PIN, `idleTimeoutMs`, or any ICS URL. `icsUrl` is absent from the calendar JSON |
| Untouched | `middleware.ts`, calendar route, weather route, `lib/date-utils.ts` exports unchanged. No week view, day view, filter chips, or idle timer |

**Do not start Phase 6 (week and day views) until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phases 1, 1.5, 2, 3, and 4 complete (kiosk CSS, `LockControl`, `GET /api/calendar` as `CalendarApiResponse`, date helpers, header shell).
- **T036**: First (hook has no UI dependency).
- **T037**: Depends on T036 (`MonthView` calls `useCalendar`).
- **T038**: Depends on T037 (shell mounts `MonthView`).
- **T039**: Depends on T038.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Four weeks from today, no document scroll | T037, T038, T039 | T039 at 1180×820; Sunday-start 28-day grid; today marked |
| US2 Events from `CalendarApiResponse` | T036, T037, T038, T039 | T039 with `/api/calendar` JSON on the wall |

### Parallel Opportunities

```text
After spec approval + "implement Phase 5":
  T036 (useCalendar)
  then T037 (MonthView)
  then T038 (shell slot + page wiring)
  then T039 (browser verification at 1180×820)
```

T036 and T037 touch different files, but T037 imports the hook, so they
are sequential. No parallel pair in this slice.

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/05-month-view.md`.
2. Execute T036–T039 only after the explicit instruction
   **implement Phase 5**.
3. Run Phase 5 Verification in the browser at 1180×820 → stop if any
   check fails.
4. Stop. Do not implement week view, day view, the filter bar, or the
   idle view-reset.

### MVP increment for this feature

US1 (the 28-day grid, today marked, zero document scroll) is the
smallest visible slice. US2 is required before calling Phase 5
complete, because the grid's job is to show events.

---

## Notes

- The grid is four weeks from the week that contains today, not the
  civil month.
- Overlap is half-open: `startTime < dayEnd` and `endTime > dayStart`
  in the dashboard timezone.
- Calendar polling matches the server TTL (600s). Do not add query
  parameters to `/api/calendar`.
- Do not revisit the PIN-gate, calendar engine, weather engine, clock,
  weather widget, or `LockControl` unless a Phase 5 change regresses
  them.
- Browser verification is part of T039. A screenshot of the grid is
  not enough; confirm the document does not scroll and the calendar
  request returns JSON.
