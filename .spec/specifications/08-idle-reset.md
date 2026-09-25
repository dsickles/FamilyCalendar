# Specification: Calendar Idle Reset and Kiosk Polish

**Feature ID**: `08-idle-reset`
**Created**: 2026-09-22
**Status**: Review complete 2026-09-25. Implemented 2026-09-22. T051–T055 complete. Do not start Phase 9 in this thread.
**Input**: `.spec/project.md` Phase 8 ("Calendar idle reset (back to month view, not PIN) and kiosk polish") and the idle-timeout table. `.spec/project.md` still lists Phases 3–8 as deferred. Phases 1, 1.5, 2, 3, 4, 5, 6, and 7 are implemented (through T050). Trust `.spec/specifications/03-weather-engine.md` through `.spec/specifications/07-filter-bar.md` and `.spec/tasks/03-weather-tasks.md` through `.spec/tasks/07-filter-tasks.md`. Where those specs disagree with the tree, trust the code.
**Constitution check**: Principle I (1180×820 fills that viewport; 1366×1024 and 1920×1080 fill those viewports; below 1180 on either edge the 1180×820 layout scales down; zero document scroll; contained vertical scroll only inside the week time grid with `overscroll-behavior: contain`; 44×44pt targets), Principle II (pass only the idle timeout number to the client; no PIN, ICS URL, or lat/lon; idle never calls `POST /api/auth/lock`), Principle III (after `IDLE_TIMEOUT_MS`, default 90_000, with no pointer or touch activity, Week or Day returns to the today-anchored month view; the timer cleans up on unmount; the session cookie stays valid)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (`CalendarViewState.lastInteractionAt`, `DashboardConfig.idleTimeoutMs`, the rule that idle restores the month view and must not call `/api/auth/lock`), `.spec/specifications/04-layout-widgets.md` (the header row), `.spec/specifications/05-month-view.md` (the today-anchored 4-week grid), `.spec/specifications/06-week-day-views.md` (week and day; navigation in the code is ahead of that spec), `.spec/specifications/07-filter-bar.md` (calendar chips). Do not reopen the PIN-gate, calendar engine, weather engine, clock, or `LockControl` unless they are broken.

This specification does two things. After 90 seconds with no pointer or touch activity, Week or Day view returns to the 4-week month grid anchored on today. The session stays unlocked. A horizontal swipe, deferred from Phase 7, changes the day or the week. The chevrons stay. The swipe must not fight the week time grid, which remains the only scroller.

## Idle reset

`idleTimeoutMs` already exists on `getDashboardConfig()` (default `90_000` from `IDLE_TIMEOUT_MS`). It is not on the client yet. `app/page.tsx` may pass that number as a prop. Client components must not import `lib/config.ts`.

`lastInteractionAt` is already on `CalendarViewState` and is forced to `0` on every update. This phase writes the client timestamp (`Date.now()`) when the operator touches the calendar, and reads it only to decide when Week or Day should return home.

| After `idleTimeoutMs` with no pointer or touch | What happens | What stays |
|-----------------------------------------------|--------------|------------|
| Week view or Day view | The main region becomes the 4-week month grid. That grid is anchored on today in the dashboard timezone, the same window `MonthView` already builds. | `activeFilters` is unchanged. The URL stays. `dash_session` is unchanged. |
| Month view already showing | The grid stays where it is. Filters stay. Selected dates in state are not rewritten. | No navigation, no remount that jumps the window, no lock request. |
| Any view | | No `POST /api/auth/lock`. No navigation to `/unlock`. The PIN pad does not appear. |

Activity that restarts the wait:

- `pointerdown` inside the calendar machine (chips, chevrons, day cells, week headers, the week time grid, the day list).
- `wheel` inside the calendar machine (scrolling the week time grid with a wheel).

A pointer moving across the screen without a press does not restart the wait. The idle callback itself is not a touch. While `mode` is `"month"`, the wait is not armed. Entering Week or Day arms it from that transition's timestamp. A later touch clears the pending timeout and arms a new one for the full `idleTimeoutMs`. When the wait elapses, the machine performs the same month return as the **4 weeks** control: `mode` becomes `"month"`, `activeFilters` is kept, and `MonthView` draws today's 28 days. `lastInteractionAt` becomes the time of that return. The wait is not armed again until the operator opens a week or a day.

If the prop is not a finite number greater than 0, the machine uses `90_000`. `lib/config.ts` stays as it is.

One `setTimeout` implements the wait. It is cleared on activity, on return to month, and on unmount. This phase does not add a `setInterval`. The clock stays on `requestAnimationFrame`.

## Horizontal swipe

The chevrons in `ViewToolbar` stay, and they stay the tap controls. A swipe is a second way to call the same previous and next actions.

| View | Swipe surface | Leftward swipe (pointer travels left) | Rightward swipe (pointer travels right) |
|------|---------------|----------------------------------------|-----------------------------------------|
| Day | The event list under the toolbar, including the empty "No events" body | Next day (`stepDay(1)`) | Previous day (`stepDay(-1)`) |
| Week | The day-header row and the all-day band only | Next week (`stepWeek(1)`) | Previous week (`stepWeek(-1)`) |
| Month | None | No period change | No period change |

A swipe counts only when, on `pointerup`, the horizontal travel is at least 48 CSS pixels and its absolute value is greater than the absolute vertical travel. The gesture starts on that view's swipe surface. A shorter movement is a tap, so header buttons, day numbers, and filter chips still click. When the gesture qualifies as a swipe, the control underneath does not also receive that click.

The week time grid (`aria-label` "Week hours") is not a swipe surface. A drag that begins there does not change the week. Vertical scrolling of that grid stays intact: `overflow-y: auto`, `overflow-x: hidden`, `overscroll-behavior: contain`. The day list stays `overflow: hidden`. The filter row stays `overflow: hidden` and does not change the day or the week when dragged.

No new package. Pointer events only. No Framer Motion drag.

## Surfaces this phase must leave in place

These are already in the tree. This phase does not rebuild them and does not revert them.

- Header is one row: clock on the left, current weather and the 3-day forecast on that same row, `LockControl` at the far right (omitted in demo mode). The forecast stacks weekday, icon, then temperature inside its own slot and does not make the header taller. View controls stay out of the header.
- 1180×820 is the primary iPad Air 2020 landscape size and fills that viewport. 1366×1024 and 1920×1080 fill those viewports. Below 1180 on either edge, `.kiosk-stage` scales the 1180×820 layout down. `html` and `body` stay fixed with `overflow: hidden`.
- The 4-week grid is anchored on today. Each week row has a 44px (`2.75rem`) chevron that opens that Sunday–Saturday week. A day cell opens that day. There is no current-month label. The day number sits in the upper left. Today also has a stamp in the today-ring color, plus the existing highlight. The first day of the next month keeps a centered shorthand (`OCT`) while the day number stays left. Weekend cells are slightly darker. A day shows every event that fits. A "+N more" row appears only when the next event would not fit, and that row takes one slot.
- Day toolbar: **Week** on the left, the date in the middle with a chevron on each side, **4 weeks** on the right. Week toolbar: empty left slot, chevrons flanking the range, **4 weeks** on the right.
- Filter chips are one per calendar, labeled "Filters:", with a dot in `calendarColor`. The row is 28px. `activeFilters` starts `[]` (show all). Hiding a calendar survives day, week, 4-week, and idle returns. Chips subset events already returned by `GET /api/calendar`. They do not refetch and they do not add query parameters.
- Week all-day chips line up with the hour columns. The day headers and the all-day row leave room for the week-grid scrollbar.
- In development, `/?demo=1` shows demo calendars. `/` stays the live feed. On 2026-09-22 the demo counts are: Sep 20–24 show 1 through 5 items, Sep 26–28 show 6 through 8, and Sep 25, Oct 1, and Oct 14 are the overflow days. Three titles are long enough to ellipsize.

## User Scenarios & Testing

### User Story 1 — Week or Day returns home after a quiet 90 seconds (Priority: P1)

The wall is glance-only most of the time. Someone opens a week or a day, then walks away. After 90 seconds with no touch, the 4-week grid is back, still anchored on today. If they were already looking at that grid, it does not move. The PIN pad stays away. A hidden calendar stays hidden.

**Why this priority**: Constitution III. The idle behavior is a view reset. Treating it as a lock would put the PIN pad back on a wall that is supposed to stay unlocked for 30 days.

**Independent Test**: In development, open `/?demo=1` at 1180×820. Open the week of the current Sunday. Do not touch the page for the configured timeout (90 seconds when `IDLE_TIMEOUT_MS` is unset). The main region is the 4-week grid that contains today. Open a day that is not today, wait again, and the same today-anchored grid returns. Sit on that grid for another timeout: it stays, the address is still `/?demo=1`, and the network has no `POST /api/auth/lock`.

**Acceptance Scenarios**:

1. **Given** Week or Day view, **When** `idleTimeoutMs` elapses with no `pointerdown` and no `wheel` inside the calendar machine, **Then** `mode` is `"month"` and the visible grid is the 28 days `MonthView` builds from today (`America/New_York` by default, week starting Sunday). `activeFilters` is the list from before the wait. `GET /api/calendar` is not called because of the timeout.
2. **Given** that return, **When** the network and the address bar are observed, **Then** the document is still on `/` or `/?demo=1`. There is no request to `/api/auth/lock` and no navigation to `/unlock`. Demo mode still shows no "Lock dashboard" control.
3. **Given** Month view, **When** the same timeout elapses with no touch, **Then** the mode stays `"month"`, the 28-day window stays the today window, and `activeFilters` is unchanged.
4. **Given** Week or Day view, **When** a `pointerdown` or a `wheel` happens before the wait elapses, **Then** the view stays on that week or day, and a new full `idleTimeoutMs` starts from that activity. A pointer move without a press does not restart the wait.
5. **Given** the machine unmounts while a wait is armed, **When** the component is gone, **Then** the timeout is cleared. Leaving the page does not later navigate to `/unlock`.

---

### User Story 2 — A sideways swipe changes day or week (Priority: P1)

The chevrons stay for a precise tap. A horizontal swipe on the day list moves one day. A horizontal swipe on the week headers or the all-day band moves one week. The hour grid still scrolls vertically and does not change weeks when a finger drags across it. The document still does not scroll.

**Why this priority**: Phase 7 deferred this gesture. It has to land without becoming a second scroller.

**Independent Test**: On `/?demo=1` at 1180×820, open a day and drag the event list left by at least 48px, with more horizontal travel than vertical. The next day opens. Drag right and the previous day returns. The chevrons still do the same steps. Open that week, drag the all-day band left, and the next week opens. Drag vertically inside "Week hours" and the grid scrolls; the week range in the toolbar does not change. Drag horizontally inside "Week hours" and the week still does not change. `document.documentElement` does not gain a scrollbar.

**Acceptance Scenarios**:

1. **Given** Day view, **When** a qualifying leftward swipe ends on the event list, **Then** the selected day moves forward one dashboard day, the same as the next-day chevron. A qualifying rightward swipe moves backward one day. The toolbar still shows Week, the date with a chevron on each side, and "4 weeks".
2. **Given** Week view, **When** a qualifying swipe ends on the day-header row or the all-day band, **Then** the Sunday–Saturday range moves one week in that direction, the same as the range chevrons. "4 weeks" stays on the right. The empty left slot stays empty.
3. **Given** Week view, **When** the gesture begins inside "Week hours", **Then** the selected week does not change. The grid still scrolls vertically, `scrollHeight` is greater than the client height, and `overscroll-behavior` is `contain`. Document scroll position stays 0.
4. **Given** Month view or the filter row, **When** the operator drags horizontally, **Then** the mode and the visible period do not change because of that drag. Filter chips still toggle on a tap. The filter row stays 28px and `overflow: hidden`.
5. **Given** any of the three views at 1180×820, 1366×1024, or 1920×1080, **When** a swipe or an idle return has just run, **Then** the stage fills that viewport and the document `scrollHeight` does not exceed the layout viewport. A window smaller than 1180×820 on either edge still scales the 1180×820 layout down.

---

### Edge Cases

- **Already home**: Idle on month view is a no-op. It must not clear `activeFilters`, must not rewrite `selectedDay` or `selectedWeekStart`, and must not call `showMonth` in a way that remounts a different 28-day window.
- **Filters**: A chip tap is a `pointerdown`, so it restarts the wait. The chip handler keeps updating `activeFilters` only. Idle return and swipe both keep the current `activeFilters`, including `[]` and the show-none sentinel.
- **Bad timeout**: A non-finite or non-positive `idleTimeoutMs` prop is treated as `90_000` inside the client. Do not edit `lib/config.ts` to do that.
- **Zero means unset in state today**: Navigation and filter updates currently assign `lastInteractionAt: 0`. This phase stops writing `0` on user actions. The initial state may stay `0` until the first Week or Day entry, which writes `Date.now()`.
- **Swipe versus tap**: Travel under 48px, or a gesture whose vertical travel is greater than or equal to its horizontal travel, does not change the period. Day-header buttons still open that day. Chevron buttons still step. A qualifying swipe does not also activate the button it started on.
- **Week grid**: Do not set `touch-action` or overflow on "Week hours" in a way that disables vertical pan. Do not add `overflow: auto` or `overflow: scroll` to the document, the day list, the filter row, the header, the all-day band, or a month cell.
- **Secrets**: The only new client prop is the number `idleTimeoutMs`. Do not pass latitude, longitude, `cacheRevalidateSeconds`, calendar sources, `icsUrl`, or anything derived from `DASHBOARD_PIN`. Client modules still do not import `lib/config.ts`.
- **Demo versus live**: `/?demo=1` in development is the demo calendar. `/` stays the live feed. Idle and swipe behave the same on both. Neither path may lock the session.
- **Hit targets**: Chevrons, the week-row chevron, Week, and "4 weeks" stay at least 44×44pt. The filter row stays 28px.

## Requirements

### Functional Requirements — Idle

- **FR-001**: `app/page.tsx` stays a Server Component. It reads `getDashboardConfig().idleTimeoutMs` and passes that number to `CalendarViewMachine` as `idleTimeoutMs`. It does not pass location coordinates, calendar sources, `icsUrl`, `cacheRevalidateSeconds`, or the PIN. `LockControl` is still omitted when `config.isDemoMode` is true. `previewDemo` stays the development `/?demo=1` flag.
- **FR-002**: `CalendarViewMachine` accepts `idleTimeoutMs: number`. It does not import `lib/config.ts`. A prop that is not a finite number greater than 0 is replaced with `90_000` before the wait is armed.
- **FR-003**: User-driven updates (`setFilters`, `showMonth`, `showWeek`, `openWeek`, `stepDay`, `stepWeek`, `openDay`) set `lastInteractionAt` to `Date.now()`. They keep the current `activeFilters` on navigation. They do not read the timeout by importing config.
- **FR-004**: While `mode` is `"week"` or `"day"`, the machine arms one timeout for the remaining time until `lastInteractionAt + idleTimeoutMs`. `pointerdown` and `wheel` inside the machine root restart that wait and set `lastInteractionAt` to `Date.now()`. `pointermove` without a press does not. When the timeout fires, if the mode is still `"week"` or `"day"`, the machine sets `mode` to `"month"` and `lastInteractionAt` to `Date.now()`, and leaves `activeFilters`, `selectedDay`, and `selectedWeekStart` as they were. `MonthView` keeps owning the today anchor. The fire path does not fetch, does not call `POST /api/auth/lock`, and does not route to `/unlock`.
- **FR-005**: While `mode` is `"month"`, no idle timeout is armed. An elapsed wait must not change month state. Unmount clears the pending timeout. The clock's animation frame and the calendar SWR hook stay as they are.

### Functional Requirements — Swipe

- **FR-006**: Day view recognizes a horizontal swipe on the event list under `ViewToolbar`. At least 48 CSS pixels of horizontal travel, with absolute horizontal travel greater than absolute vertical travel, on `pointerup`, calls the existing `onNextDay` when the pointer moved left and `onPreviousDay` when it moved right. The list remains `overflow: hidden`.
- **FR-007**: Week view recognizes that same swipe on the day-header row and the all-day band, calling `onNextWeek` or `onPreviousWeek`. The "Week hours" scroller is excluded. Its overflow and `overscroll-behavior: contain` stay. A gesture that begins in that scroller does not change `selectedWeekStart`.
- **FR-008**: Month view and the filter row do not change period on a horizontal drag. A qualifying swipe suppresses the click on the element that received `pointerdown`. A non-qualifying gesture still clicks. `ViewToolbar` keeps Week, the chevrons, and "4 weeks" as they are in the tree.
- **FR-009**: Swipe uses pointer events. No new dependency and no Framer Motion. No swipe handler sets document overflow, and none adds a scroll container outside "Week hours".

### Key Entities / Data Contracts

`CalendarViewState` is not rewritten. `lastInteractionAt` starts at `0` and then stores `Date.now()` after the first user action or idle return. `activeFilters` keeps the Phase 7 meaning.

```typescript
export interface CalendarViewState {
  mode: "month" | "week" | "day";
  anchorDate: string; // "YYYY-MM-DD"
  selectedWeekStart?: string;
  selectedDay?: string;
  activeFilters: string[]; // [] = every calendar; else the calendarIds still shown
  lastInteractionAt: number; // Date.now() after activity; 0 only before the first write
}
```

`DashboardConfig.idleTimeoutMs` stays the server field from Phase 1. The client receives a copy of the number only.

### Shell composition

```text
app/page.tsx (server)
  passes idleTimeoutMs (number) into CalendarViewMachine
  .kiosk-frame / .kiosk-stage unchanged
    DashboardShell unchanged
      header: ClockWidget | WeatherWidget | LockControl
      main: CalendarViewMachine
        FilterBar
        month | week | day
          idle: week/day -- 90s quiet --> month (today), filters kept
          swipe: day list, or week headers + all-day band
          week time grid: vertical scroll only
```

## Success Criteria

- **SC-001**: On week view and on day view, 90 seconds without a pointer press or a wheel returns the 4-week grid anchored on today. A hidden calendar is still hidden. The calendar request is not repeated because of the timeout.
- **SC-002**: On month view, the same 90 seconds leaves the grid, the filters, and the URL in place. Across all three, the network shows no `POST /api/auth/lock` and the page does not become `/unlock`.
- **SC-003**: A qualifying horizontal swipe on the day list steps one day. The same swipe on the week day headers or the all-day band steps one week. Chevrons still perform those steps. A drag that begins in the week time grid does not step the week, and that grid still scrolls vertically with `overscroll-behavior: contain`.
- **SC-004**: At 1180×820, 1366×1024, and 1920×1080 the stage fills the viewport after an idle return and after a swipe. The document does not scroll. Below 1180 on either edge the existing scale still applies. The header stays one row. The filter row stays 28px.
- **SC-005**: Client bundles gain the numeric timeout only. They still contain no PIN, no ICS URL, and no latitude or longitude. `lib/config.ts` is not imported by a client module. The pending timeout is cleared on unmount.

## Assumptions

- `MonthView` already anchors the 28 days on today via `getWeekBounds`. Idle return does not need a new anchor prop. Showing month is enough.
- Default config remains `America/New_York`, `weekStartDay` `0`, `timeFormat` `12h`, and `idleTimeoutMs` `90000`.
- `pointerdown` covers mouse and touch. A wall iPad and a desktop check use the same wait.
- The week time grid is taller than its box at 1180×820, so the contained scroller still has somewhere to move after the filter row.
- Demo event counts for 2026-09-22 are already produced by `generateDemoEvents()`. This phase does not edit that generator.
- Verification uses the configured timeout. The default in source stays `90_000`.

## Out of Scope (this specification)

- Phase 9 (real feeds, device test, README)
- Editing `middleware.ts`, the auth routes, `LockControl`, the clock, the weather widget, `DashboardShell`, the calendar engine, the weather engine, `useCalendar`, `lib/date-utils.ts`, or `lib/demo-data.ts`
- Rewriting month-cell geometry, the filter model, or `ViewToolbar` layout
- A swipe that changes the month grid's window
- Vertical swipe as navigation
- Calling `/api/auth/lock` from the idle path, expiring `dash_session`, or showing the PIN pad
- A new npm dependency

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | Idle and swipe add no document scroll and no second scroller; the week time grid stays the only contained vertical scroll; 1180×820, 1366×1024, and 1920×1080 still fill the viewport; smaller windows keep the existing scale |
| II Privacy | The client receives `idleTimeoutMs` as a number from the server page; no `lib/config.ts` import on the client; no PIN, ICS URL, or coordinates added to props |
| III Appliance | One cleared timeout returns Week or Day to the today-anchored month view; month view is left alone; the session cookie is not cleared; the clock stays on `requestAnimationFrame` |
