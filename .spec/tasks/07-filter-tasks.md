# Tasks: Filter Bar

**Input**: `.spec/specifications/07-filter-bar.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 7 (filter bar). Phases 3, 4, 5, and 6 are already implemented (T027–T043). Ignore the stale "Phase 3 deferred" through "Phase 8 deferred" rows in `.spec/project.md`.
**Status**: Implemented 2026-09-22. T044–T050 complete. Revised the same day: chips are one per calendar, labeled "Filters:", color-matched to `calendarColor`. Do not start Phase 8 in this thread.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before Phase 8.

**Organization**: One implementation slice (Phase 7). PIN-gate, calendar
engine, weather engine, clock, weather widget, month-grid geometry, week
view, day view, and `LockControl` already exist — do not revisit them
unless they are broken. Phase 6 navigation in the code is ahead of
`.spec/specifications/06-week-day-views.md`. Leave that navigation as
the code has it.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US2]**: Maps to user stories in the specification
- Step IDs (`7.1` … `7.5`) are this phase's plan steps
- Task IDs continue from Phase 6 (`T043`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). `app/page.tsx`
stays a Server Component and stays as it is. `CalendarViewMachine`,
`FilterBar`, `MonthView`, `DayView`, and `WeekView` are Client
Components. They MUST NOT import `lib/config.ts` or any server
engine/cache module. `lib/calendar-filters.ts` may import the
`UnifiedEvent` type only. `lib/hooks/useCalendar.ts` may be imported;
do not change its exports.

The header to preserve is the one in the tree now:

- Header row: clock, then current weather and the 3-day forecast, then
  `LockControl` at the far right (omitted in demo mode).
- View controls stay out of the header. Day toolbar: Week, date with a
  chevron on each side, "4 weeks". Week toolbar: empty left slot,
  chevrons flanking the range, "4 weeks". The 4-week grid is anchored
  on today; each week row's 44px chevron opens that Sunday–Saturday
  week; a day cell opens that day. Today and the first day of a new
  month show the month name in the cell ("September 22", "October 1").
- 1180×820 fills that viewport and is the primary check. 1366×1024 and
  1920×1080 fill those viewports too. A window smaller than 1180×820
  on either edge scales the 1180×820 layout down. Zero document scroll.
  Contained vertical scroll stays only inside the week time grid.

The header row is already full at 1180×820. Chips go in a 44px row
under that header, inside the main column, above the active view.

**Do not start Phase 8 (idle view-reset) in the same chat as this implementation.**

---

## Phase 7: Filter Bar

**Purpose**: Four category chips subset the events already returned by
`GET /api/calendar`. They do not refetch and they do not add query
parameters. `activeFilters` stays `[]` until a chip is toggled.
`lastInteractionAt` stays `0`.

**Goal**: `/` keeps the header row and the Phase 6 toolbars. A 44px
chip row sits under the header on the 4-week, week, and day views.
The stage still fills 1180×820, 1366×1024, and 1920×1080.

- [x] T044 [P] [US2] Step 7.1 — Add `lib/calendar-filters.ts`. Export
      `CALENDAR_CATEGORIES = ["person", "shared", "utility", "external"] as const`
      and `CalendarCategory`. Export `eventsMatchingFilters(events, activeFilters)`:
      when `activeFilters` contains none of those four ids, return the
      same events in the same order; otherwise return events whose
      `calendarCategory` is one of the recognized ids, in input order.
      Export `toggleCategory(activeFilters, category)`: from `[]` return
      `[category]`; if the id is present, remove it; if it is absent,
      add it; the result contains only the four ids in
      `CALENDAR_CATEGORIES` order; removing the last id returns `[]`.
      Import the `UnifiedEvent` type only. Do not import `lib/config.ts`,
      `lib/calendar-engine.ts`, `lib/calendar-cache.ts`,
      `lib/hooks/useCalendar.ts`, or any weather module. Do not edit
      `lib/types/ui-state.ts`. File: `lib/calendar-filters.ts`.
- [x] T045 [P] [US1] Step 7.2 — Add `components/calendar/FilterBar.tsx`
      as a Client Component. Props: `activeFilters: string[]` and
      `onToggle: (category: CalendarCategory) => void`. Root: a group
      named "Calendar categories", `h-11 shrink-0 overflow-hidden`,
      one row, `px-6`, no wrap, no `overflow: auto` or `scroll`. Four
      `<button type="button">` controls, labels Person, Shared, Utility,
      External, in that order. Each is at least 44×44pt. `aria-pressed`
      is true only when that id is in `activeFilters`. Pressed and
      unpressed styles are distinguishable on `#0a0a0f`. Do not use
      `calendarColor`. No Framer Motion. Do not import `lib/config.ts`.
      File: `components/calendar/FilterBar.tsx`.
- [x] T046 [P] [US2] Step 7.3 — Teach `MonthView` to filter before it
      places chips. Add required `activeFilters: string[]`. Keep the
      `useCalendar` call with no query string. When `events` is an
      array, pass `eventsMatchingFilters(events, activeFilters)` into
      the existing `eventsOnDay` path. Do not change the 28-day math,
      `GRID_COLS` (`2.75rem` chevron column), `dayHeading`, cell
      buttons, clipping, or the `requestAnimationFrame` today loop.
      Do not edit `lib/hooks/useCalendar.ts`. File:
      `components/calendar/MonthView.tsx`.
- [x] T047 [P] [US2] Step 7.3 — Teach `DayView` the same filter. Add
      required `activeFilters: string[]`. Keep `useCalendar` with no
      query string. Filter `events` with `eventsMatchingFilters` before
      `eventsOnDay`, so both the all-day group and the timed rows use
      the subset. Do not change `ViewToolbar` usage (Week, date,
      previous/next day, "4 weeks"), the "No events" / "Calendar
      unavailable" copy, or `overflow: hidden` on the section. File:
      `components/calendar/DayView.tsx`.
- [x] T048 [P] [US2] Step 7.3 — Teach `WeekView` the same filter. Add
      required `activeFilters: string[]`. Keep `useCalendar` with no
      query string. Filter `events` once with `eventsMatchingFilters`
      before placement, so the all-day band and the timed blocks both
      use the subset. Do not change `ViewToolbar` (empty left slot,
      range chevrons, "4 weeks"), day headings, the 24×48px hour grid,
      the one-time `scrollTop`, or the time grid's `overflow-y: auto`,
      `overflow-x: hidden`, and `overscroll-behavior: contain`. File:
      `components/calendar/WeekView.tsx`.
- [x] T049 [US1] [US2] Step 7.4 — Mount the bar and stop clearing the
      filter on navigation. In `components/calendar/CalendarViewMachine.tsx`,
      wrap the active view in `flex h-full min-h-0 flex-col overflow-hidden`.
      Render `FilterBar` first. Put the view in
      `min-h-0 flex-1 overflow-hidden`. Pass `view.activeFilters` into
      `FilterBar`, `MonthView`, `DayView`, and `WeekView`. `onToggle`
      calls `toggleCategory` and updates `activeFilters` only, leaving
      `mode`, `anchorDate`, `selectedDay`, and `selectedWeekStart` as
      they were, and leaving `lastInteractionAt` at `0`. In `showMonth`,
      `showWeek`, `openWeek`, `stepDay`, `stepWeek`, and `openDay`,
      keep the current `activeFilters` (those handlers today assign
      `[]`; stop doing that). Keep assigning `lastInteractionAt: 0`.
      Do not read `idleTimeoutMs`. Do not rewrite `CalendarViewState`.
      Do not edit `app/page.tsx`, `DashboardShell.tsx`,
      `ViewToolbar.tsx`, `LockControl.tsx`, `ClockWidget.tsx`,
      `WeatherWidget.tsx`, `middleware.ts`, `lib/date-utils.ts`,
      `lib/demo-data.ts`, `app/globals.css`, or either API route.
      File: `components/calendar/CalendarViewMachine.tsx`.
- [x] T050 [US1] [US2] Step 7.5 — Verification only (no new product
      files). Run the app and check `/` in the browser at 1180×820
      landscape on the 4-week, week, and day views per the gate below.
      Also confirm 1366×1024 and 1920×1080 still fill the viewport with
      no document scroll. Do not start the idle view-reset.

### Phase 7 Verification

`/` keeps the header row and the Phase 6 toolbars. The four chips sit
on one 44px row under the header. Toggling Person subsets the events
already loaded. The document does not scroll. The week time grid is
still the only scroller.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Viewport 1180×820 | Browser at 1180×820 on 4-week, week, and day: no document scrollbar; document `scrollHeight` does not exceed the layout viewport; background `#0a0a0f`; the stage fills that viewport; the chip row is one line and is not a scroll container |
| Larger sizes | At 1366×1024 and 1920×1080 the stage fills the viewport. The chip row stays one 44px line. Document still does not scroll. A window smaller than 1180×820 on either edge scales the primary layout down |
| Header | Clock, current weather, and the 3-day forecast stay on one header row. Demo mode: no "Lock dashboard" button. `DashboardShell.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, and `LockControl.tsx` unchanged |
| Chips | Four buttons, in order Person, Shared, Utility, External, each at least 44×44pt, in a group named "Calendar categories". None are `aria-pressed` on first paint |
| Person subset | On today in demo mode, activating Person keeps "Standup" (`#6366f1`) and "Client call" and hides "Family dinner" and "School pickup" on the 4-week cell, on that day, and on that week column. `GET /api/calendar` has no query string. The activation does not itself send another calendar request |
| Toggle rules | Adding Shared restores "Family dinner" while Person stays pressed. Deactivating the last pressed chip restores every category. Utility alone shows "No events" on the day and does not show "Calendar unavailable" |
| Filter survives navigation | With Person pressed, opening a day, opening its week, and returning with "4 weeks" still hides "Family dinner". `lastInteractionAt` is not updated. `idleTimeoutMs` is not read |
| Navigation unchanged | 4-week grid stays anchored on today. The week chevron opens that Sunday–Saturday week. A day cell opens that day. Day toolbar is Week / date with chevrons / "4 weeks". Week toolbar is empty left / range with chevrons / "4 weeks". Today and the first of a month still show the month name in the cell |
| Week scroll | The time grid still scrolls (`scrollHeight` greater than client height, `overscroll-behavior: contain`). Scrolling it leaves document scroll at 0. The chip row, header, day headings, and all-day band do not scroll |
| Secrets | Client props do not include latitude, longitude, PIN, `idleTimeoutMs`, or any ICS URL. `icsUrl` is absent from the calendar JSON. `lib/config.ts` is not imported by the filter bar or the filter helper |
| Untouched | `middleware.ts`, calendar route, weather route, `useCalendar`, `lib/date-utils.ts`, `lib/demo-data.ts`, `ViewToolbar.tsx`, `app/page.tsx`, `.kiosk-frame`, `.kiosk-stage`, and the `html` / `body` overflow resets unchanged |

**Do not start Phase 8 (idle view-reset) until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phases 1, 1.5, 2, 3, 4, 5, and 6 complete (kiosk stage, header row, `LockControl`, `GET /api/calendar` as `CalendarApiResponse`, `useCalendar`, `CalendarViewMachine`, month, week, and day).
- **T044**: Filter helpers. No dependency on T045.
- **T045**: Filter bar component. No dependency on T044.
- **T046, T047, T048**: Depend on T044 (they call `eventsMatchingFilters`). No dependency on each other.
- **T049**: Depends on T045, T046, T047, and T048.
- **T050**: Depends on T049.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Four chips fit under the header on every view | T045, T049, T050 | T050 at 1180×820: one 44px row on 4-week, week, and day; document does not scroll |
| US2 Chips subset `CalendarApiResponse.events` without a refetch | T044, T046, T047, T048, T049, T050 | T050: Person hides "Family dinner" and keeps "Standup"; no new calendar request; the filter survives navigation |

### Parallel Opportunities

```text
After spec approval + "implement Phase 7":
  T044 (calendar-filters) and T045 (FilterBar) in parallel
  then T046 (MonthView), T047 (DayView), and T048 (WeekView) in parallel
  then T049 (CalendarViewMachine wiring)
  then T050 (browser verification at 1180×820 on all three views)
```

T044 and T045 touch different files. T046, T047, and T048 touch different files and do not import each other.

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/07-filter-bar.md`.
2. Execute T044–T050 only after the explicit instruction
   **implement Phase 7**. Approval of these two files is not that
   instruction.
3. Run Phase 7 Verification in the browser at 1180×820 on the 4-week,
   week, and day views → stop if any check fails.
4. Stop. Do not implement the idle view-reset.

### MVP increment for this feature

US1 (the 44px row visible on the 4-week grid without document scroll)
is the smallest visible slice. US2 is required before calling Phase 7
complete: the chips must subset the loaded events on all three views
without a refetch, and the selection must survive navigation.

---

## Notes

- `activeFilters: []` means show every category. Do not seed it with
  all four ids.
- Store category ids in canonical order: `person`, `shared`, `utility`,
  `external`. Visible labels are Person, Shared, Utility, External.
- Demo data has no `utility` events. The Utility chip still renders.
  Selecting it alone is an empty day, not an error.
- Person covers Alex (`#6366f1`, "Standup") and Jordan (`#ec4899`,
  "Client call"). The chip is not colored with either hex.
- The machine currently writes `activeFilters: []` inside every
  navigation handler. T049 preserves the current list instead.
- `lastInteractionAt` stays `0` on toggle and on navigation. Do not
  read `idleTimeoutMs`.
- Do not revisit the PIN-gate, calendar engine, weather engine, clock,
  weather widget, month-grid geometry, week view, day view, or
  `LockControl` unless a Phase 7 change regresses them.
- Browser verification is part of T050. A screenshot of the chip row
  is not enough; confirm the document does not scroll, that a chip
  does not refetch, and that the subset is the same on 4-week, week,
  and day.
