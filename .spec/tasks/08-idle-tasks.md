# Tasks: Calendar Idle Reset and Kiosk Polish

**Input**: `.spec/specifications/08-idle-reset.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 8 (calendar idle reset and kiosk polish). Phases 1, 1.5, 2, 3, 4, 5, 6, and 7 are already implemented (through T050). Ignore the stale "Phase 3 deferred" through "Phase 8 deferred" rows in `.spec/project.md`.
**Status**: Review complete 2026-09-25. Implemented 2026-09-22. T051–T055 complete. Do not start Phase 9 in this thread.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before Phase 9.

**Organization**: One implementation slice (Phase 8). PIN-gate, calendar
engine, weather engine, clock behavior, and `LockControl` already exist —
do not revisit them unless they are broken. Phase 6 navigation and the
later UI decisions listed in the specification are in the code. Leave
them as the code has them.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US2]**: Maps to user stories in the specification
- Step IDs (`8.1` … `8.4`) are this phase's plan steps
- Task IDs continue from Phase 7 (`T050`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). `app/page.tsx`
stays a Server Component. It may pass `idleTimeoutMs` as a number.
`CalendarViewMachine`, `DayView`, and `WeekView` are Client Components.
They MUST NOT import `lib/config.ts` or any server engine/cache module.

The header, the stage, the filter row, and the view chrome stay as they
are in the tree:

- Header row: clock, then current weather and the 3-day forecast (weekday,
  icon, then temperature), then `LockControl` at the far right (omitted
  in demo mode). View controls stay out of the header.
- 1180×820 fills that viewport and is the primary check. 1366×1024 and
  1920×1080 fill those viewports too. A window smaller than 1180×820 on
  either edge scales the 1180×820 layout down. Zero document scroll.
  Contained vertical scroll stays only inside the week time grid.
- Filter row: 28px, "Filters:", one chip per calendar with a dot in
  `calendarColor`. `activeFilters` starts `[]`.
- Day toolbar: Week, date with a chevron on each side, "4 weeks". Week
  toolbar: empty left slot, chevrons flanking the range, "4 weeks".
  The 4-week grid is anchored on today.

**Do not start Phase 9 in the same chat as this implementation.**

---

## Phase 8: Idle Reset and Kiosk Polish

**Purpose**: After `idleTimeoutMs` (default 90_000) with no pointer or
touch activity, Week or Day returns to the today-anchored 4-week grid.
Month view and the session cookie stay put. A horizontal swipe steps
the day or the week without taking the week time grid's scroll.

**Goal**: `/?demo=1` keeps the header, the filter row, and the Phase 6
toolbars. Idle and swipe do not add a scroller and do not call
`POST /api/auth/lock`.

- [x] T051 [US1] Step 8.1 — Pass the timeout number into the machine.
      In `app/page.tsx`, pass `idleTimeoutMs={config.idleTimeoutMs}` on
      `CalendarViewMachine`. Pass nothing else new: no latitude, no
      longitude, no `cacheRevalidateSeconds`, no calendar sources, no
      `icsUrl`, no PIN. Keep `previewDemo` as the development
      `demo=1` search param. In
      `components/calendar/CalendarViewMachine.tsx`, add required prop
      `idleTimeoutMs: number`. Do not import `lib/config.ts`. Do not
      arm a timer in this task. File: `app/page.tsx`,
      `components/calendar/CalendarViewMachine.tsx`.
- [x] T052 [US1] Step 8.2 — Arm the view-reset and stop writing
      `lastInteractionAt: 0` on user actions. In
      `components/calendar/CalendarViewMachine.tsx`, treat a non-finite
      or non-positive `idleTimeoutMs` as `90_000`. `setFilters`,
      `showMonth`, `showWeek`, `openWeek`, `stepDay`, `stepWeek`, and
      `openDay` set `lastInteractionAt` to `Date.now()` and keep the
      current `activeFilters` on navigation. Listen for `pointerdown`
      and `wheel` on the machine root (not `pointermove`) and write
      `Date.now()` plus re-arm. While `mode` is `"week"` or `"day"`,
      one `setTimeout` fires at `lastInteractionAt + idleTimeoutMs`.
      If the mode is still week or day, set `mode` to `"month"` and
      `lastInteractionAt` to `Date.now()`, and leave `activeFilters`,
      `selectedDay`, and `selectedWeekStart` unchanged. Do not pass a
      new anchor into `MonthView`. While `mode` is `"month"`, clear
      any pending timeout and do not arm another. Clear the timeout on
      unmount. Do not call `fetch`, do not `POST /api/auth/lock`, and
      do not navigate to `/unlock`. Do not add `setInterval`. File:
      `components/calendar/CalendarViewMachine.tsx`.
- [x] T053 [P] [US2] Step 8.3 — Swipe the day list. In
      `components/calendar/DayView.tsx`, on the event-list container
      under `ViewToolbar` (the `overflow-hidden` body, including the
      empty "No events" state), track a pointer gesture. On `pointerup`,
      if horizontal travel is at least 48 CSS pixels and greater than
      the absolute vertical travel, call `onNextDay` when the pointer
      moved left and `onPreviousDay` when it moved right, and suppress
      the click from that gesture. A shorter or more vertical gesture
      stays a tap. Leave the list `overflow: hidden`. Do not edit
      `ViewToolbar.tsx`. Do not add a dependency. File:
      `components/calendar/DayView.tsx`.
- [x] T054 [P] [US2] Step 8.3 — Swipe the week chrome only. In
      `components/calendar/WeekView.tsx`, use the same 48px rule on the
      day-header row and the all-day band. Left calls `onNextWeek`,
      right calls `onPreviousWeek`, and a qualifying swipe suppresses
      the click. Do not attach the recognizer to the "Week hours"
      scroller. Leave that scroller `overflow-x-hidden overflow-y-auto
      overscroll-contain`, and leave the scrollbar padding on the
      header and all-day rows. A gesture that begins in "Week hours"
      must not change `selectedWeekStart`. Do not edit
      `ViewToolbar.tsx`. File: `components/calendar/WeekView.tsx`.
- [x] T055 [US1] [US2] Step 8.4 — Verification only (no new product
      files). Run the app and check `/?demo=1` in the browser per the
      gate below, at 1180×820 on month, week, and day. Also confirm
      1366×1024 and 1920×1080 still fill the viewport with no document
      scroll. Use the configured timeout (90 seconds when
      `IDLE_TIMEOUT_MS` is unset). Do not lower the default in
      `lib/config.ts`. Do not start Phase 9.

### Phase 8 Verification

`/?demo=1` keeps the header row, the 28px filter row, and the Phase 6
toolbars. A quiet week and a quiet day each return to today's 4-week
grid. A quiet month stays. No lock request fires. A sideways swipe
steps day or week, and the week time grid still owns vertical scroll.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Viewport 1180×820 | Browser at 1180×820 on 4-week, week, and day after a swipe and after an idle return: no document scrollbar; document `scrollHeight` does not exceed the layout viewport; background `#0a0a0f`; the stage fills that viewport |
| Larger sizes | At 1366×1024 and 1920×1080 the stage fills the viewport. Document still does not scroll. A window smaller than 1180×820 on either edge scales the primary layout down |
| Header and filters | Clock, current weather, and the 3-day forecast stay on one header row. The forecast still stacks weekday, icon, then temperature. Demo mode: no "Lock dashboard" button. The filter row is still 28px, labeled "Filters:", one dot per calendar. `DashboardShell.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, `LockControl.tsx`, and `FilterBar.tsx` unchanged |
| Idle from week | Open a week, do not press or wheel for the configured timeout. The main region is the 4-week grid whose first day is the Sunday of the current week. A calendar that was hidden before the wait is still hidden. The timeout does not itself send `GET /api/calendar` |
| Idle from day | Open a day other than today (Oct 1 on the 2026-09-22 demo is enough). After the same quiet wait, the today-anchored 4-week grid is back. Filters still match |
| Idle on month | Stay on that grid with no press and no wheel for the same timeout. Mode stays month. The 28-day window does not jump. Filters stay |
| Session | During those three waits, the URL stays on `/?demo=1`. The network has no `POST /api/auth/lock` and no navigation to `/unlock` |
| Activity resets the wait | On week view, scroll the time grid or press once, then confirm the week is still showing at the moment the original quiet window would have ended. After a new full quiet period, the month grid returns |
| Day swipe | On the day list, a leftward drag of at least 48px with more horizontal than vertical travel opens the next day. A rightward drag opens the previous day. The previous-day and next-day chevrons still do those steps. A short drag still clicks |
| Week swipe | The same drag on the day-header row or the all-day band steps one week. The range chevrons still step a week. A drag that begins inside "Week hours" does not change the range. That grid still scrolls (`scrollHeight` greater than client height, `overscroll-behavior: contain`) and document scroll stays 0 |
| Month drag | A horizontal drag on the 4-week grid and on the filter row does not change `mode`. A chip tap still toggles that calendar |
| Surfaces kept | Week-row chevron is still 44px and opens that Sunday–Saturday week. A day cell opens that day. Day number is upper left. Today has the today-ring stamp. The first of a month keeps the centered shorthand (`OCT`) with the day number on the left. Weekend cells stay slightly darker. "+N more" appears only when the next event would not fit |
| Secrets | Client props add only the numeric `idleTimeoutMs`. They do not include latitude, longitude, PIN, or any ICS URL. `icsUrl` is absent from the calendar JSON. `lib/config.ts` is not imported by `CalendarViewMachine`, `DayView`, or `WeekView` |
| Untouched | `middleware.ts`, auth routes, calendar route, weather route, `useCalendar`, `lib/config.ts`, `lib/date-utils.ts`, `lib/demo-data.ts`, `ViewToolbar.tsx`, `LockControl.tsx`, `app/globals.css` kiosk resets, and `.kiosk-stage` unchanged |

**Do not start Phase 9 until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phases 1, 1.5, 2, 3, 4, 5, 6, and 7 complete (kiosk stage, header row, `LockControl`, `GET /api/calendar`, `CalendarViewMachine`, month, week, day, filter chips).
- **T051**: Prop wiring. No product timer yet.
- **T052**: Depends on T051 (the machine must accept `idleTimeoutMs`).
- **T053**: Day swipe. No dependency on T051 or T052. Calls the existing day callbacks.
- **T054**: Week swipe. No dependency on T051, T052, or T053. Calls the existing week callbacks.
- **T055**: Depends on T052, T053, and T054.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Quiet Week or Day returns to today's 4-week grid; month and the session stay | T051, T052, T055 | T055: week and day each return after the configured timeout; month does not move; no `POST /api/auth/lock` |
| US2 Horizontal swipe steps day or week and leaves the time grid as the only scroller | T053, T054, T055 | T055: day-list swipe steps a day; week chrome swipe steps a week; a drag inside "Week hours" does not; document scroll stays 0 |

### Parallel Opportunities

```text
After spec approval + "implement Phase 8":
  T051 (pass idleTimeoutMs)
  T053 (DayView swipe) and T054 (WeekView swipe) in parallel with T051
  then T052 (idle timer in CalendarViewMachine) after T051
  then T055 (browser verification, including the real timeout)
```

T053 and T054 touch different files. T052 touches the machine only, so it can follow T051 while the swipe tasks are already in those view files.

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/08-idle-reset.md`.
2. Execute T051–T055 only after the explicit instruction
   **implement Phase 8**. Approval of these two files is not that
   instruction.
3. Run Phase 8 Verification in the browser at 1180×820 on month, week,
   and day, including the configured idle wait → stop if any check fails.
4. Stop. Do not implement Phase 9.

### MVP increment for this feature

US1 (week and day return to the today-anchored month grid, month stays,
session stays) is the smallest complete slice. US2 is required before
calling Phase 8 complete: the deferred swipe has to step day and week
without fighting the week time grid.

---

## Notes

- `lastInteractionAt: 0` remains legal only as the initial state, before
  the first user action. User actions and the idle return store
  `Date.now()`.
- The idle return matches the **4 weeks** control: `mode` becomes
  `"month"`, filters stay, and `MonthView` rebuilds the window from
  today. Do not add an anchor prop to `MonthView`.
- Pointer travel of 48 CSS pixels is the swipe threshold. Vertical
  travel that is greater than or equal to horizontal travel is not a
  swipe.
- The week time grid is the only element that may use `overflow: auto`
  or `overflow: scroll`.
- Do not revisit the PIN-gate, calendar engine, weather engine, clock,
  or `LockControl` unless a Phase 8 change regresses them.
- Browser verification is part of T055. A screenshot is not enough.
  Confirm the quiet wait on week and day, the no-op on month, the
  absence of a lock request, and that a week-grid drag does not change
  the week.
