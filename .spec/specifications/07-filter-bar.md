# Specification: Filter Bar

**Feature ID**: `07-filter-bar`
**Created**: 2026-09-22
**Status**: Implemented 2026-09-22. Revised the same day: chips are one per calendar (`calendarId`, `calendarLabel`, `calendarColor`), not per category. Human review next. Do not start Phase 8 in this thread.
**Input**: `.spec/project.md` Phase 7 ("Filter bar") and the runtime shape (client chips subset an already-fetched `UnifiedEvent[]`). `.spec/project.md` still lists Phases 3–8 as deferred. Phases 3, 4, 5, and 6 are implemented (T027–T043). Trust `.spec/specifications/03-weather-engine.md` through `.spec/specifications/06-week-day-views.md` and `.spec/tasks/03-weather-tasks.md` through `.spec/tasks/06-week-day-tasks.md`. Phase 6 navigation in the code is ahead of `.spec/specifications/06-week-day-views.md`. Trust the code for that navigation.
**Constitution check**: Principle I (primary layout 1180×820, the same layout fills 1366×1024 and 1920×1080, zero document scroll, contained vertical scroll only inside the week time grid with `overscroll-behavior: contain`, 44×44pt targets), Principle II (no PIN, ICS URL, or lat/lon added to the client; chips use `calendarCategory` only), Principle III (reuse the existing calendar SWR hook, no new fetch, no `setInterval`, no idle lock, no idle view-reset)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (`UnifiedEvent.calendarCategory`, `CalendarViewState.activeFilters`), `.spec/specifications/02-calendar-engine.md` (`CalendarApiResponse` only — do not change the engine or the route), `.spec/specifications/04-layout-widgets.md` (the header row), `.spec/specifications/05-month-view.md` (the 4-week grid), `.spec/specifications/06-week-day-views.md` (week and day). Do not reopen the PIN-gate, calendar engine, weather engine, clock, weather widget, month-grid geometry, week view, day view, or `LockControl` unless they are broken.

This specification adds a filter bar. Each chip is one calendar from the events `GET /api/calendar` already returned: its label and its `calendarColor`. The chips subset those events by `calendarId`. They do not refetch and they do not add query parameters. `activeFilters` starts as `[]` (every calendar visible). Toggling a chip hides or shows that calendar. `lastInteractionAt` stays `0`. The idle view-reset is out of scope.

Category chips (`person | shared | utility | external`) are not the filter. `calendarCategory` stays on the event and is not what the bar toggles.

## Where the chips sit

The header is one row and it is already full at 1180×820: clock on the left, current weather and the 3-day forecast on that same row, `LockControl` at the far right (omitted in demo mode). View controls stay out of that row.

The chips are a single 28px row in the main column, directly under that header and directly above the current view (4-week, week, or day). The row is labeled **Filters:** and then one entry per calendar: a filled dot in `calendarColor` and the `calendarLabel`, in the same pattern as a color legend. It does not wrap, does not scroll, and does not grow past 28px. The view under it keeps `min-h-0 flex-1 overflow-hidden` and absorbs that 28px. The document does not scroll. The same row stays mounted on week view and day view.

```text
header (unchanged, one row)
  clock          current weather + 3-day forecast          lock

main
  Filters:  (Alex) (Jordan) (Family) (School)     28px, dot + name, one line
  4-week grid  |  week planner  |  day list       fills whatever remains
```

The names and colors come from the loaded events. Demo mode is Alex `#6366f1`, Jordan `#ec4899`, Family `#10b981`, School `#8b5cf6`. A live feed shows that feed's own label and color. The dot color is the same hex the event chip already uses as its left border.

| Viewport | What the chip row does |
|----------|------------------------|
| **1180×820** | One 28px line under the header. Primary check. |
| **1366×1024** and **1920×1080** | The same 28px line. Extra width and height go into the calendar. The stage still fills the viewport. |
| Smaller than 1180×820 on either edge | The existing 1180×820 stage scale includes the chip row. No new scroll container. |

The week time grid remains the only element that uses `overflow: auto` or `overflow: scroll`. The chip row uses `overflow: hidden`.

## Navigation this phase must leave in place

Phase 6 navigation in the tree is the source of truth. This phase does not move it and does not put it in the header.

- The 4-week grid stays anchored on today. Each week row keeps its 44px (`2.75rem`) chevron, which opens that Sunday–Saturday week. A day cell opens that day.
- Today and the first day of a new month keep the month name in the cell (`September 22`, `October 1`).
- Day view toolbar: **Week** on the left, the date in the middle with a chevron on each side, **4 weeks** on the right.
- Week view toolbar: empty left slot, chevrons flanking the range, **4 weeks** on the right.
- `ViewToolbar` stays the owner of those controls. The filter row is not a second copy of them.

## User Scenarios & Testing

### User Story 1 — A calendar legend fits under the header (Priority: P1)

A glance from about 3 feet still sees the same header. Under it, a short row reads "Filters:" and then one colored dot and name for each calendar in the loaded events. The row stays on the 4-week, week, and day views. The wall still has no document scroll.

**Why this priority**: The header cannot take the chips. The row has to name the same calendars the event colors already use, and it has to stay short enough that the calendar still fills the stage.

**Independent Test**: In demo mode at 1180×820, `/` shows "Filters:" then Alex, Jordan, Family, and School, each with a dot in that calendar's color (`#6366f1`, `#ec4899`, `#10b981`, `#8b5cf6`). The row is 28px tall. Open a day, then that week's view. The same row is still there. `document.documentElement` does not gain a scrollbar.

**Acceptance Scenarios**:

1. **Given** `/` in demo mode, **When** the 4-week grid is showing, **Then** the header is still one row. Under it, a group named "Filters" shows the text "Filters:" and one button per calendar in first-seen order: Alex, Jordan, Family, School. Each button shows a filled dot painted with that event's `calendarColor` and the `calendarLabel`. The row's border box is 28px tall, `flex-shrink: 0`, `overflow: hidden`, and the buttons stay on one line.
2. **Given** that row, **When** a day is opened and then its week, **Then** the same calendar buttons stay mounted above day view and above week view. Day view still shows Week, the date with a chevron on each side, and "4 weeks". Week view still shows an empty left slot, chevrons around the range, and "4 weeks".
3. **Given** any of the three views, **When** the viewport is 1180×820, 1366×1024, or 1920×1080, **Then** the stage fills that viewport, the filter row stays one 28px line, and the document `scrollHeight` does not exceed the layout viewport.

---

### User Story 2 — A chip hides that calendar's events (Priority: P1)

Each chip is one `calendarId`. An empty `activeFilters` shows every event, and every chip is shown in full color. Toggling a chip hides that calendar and dims its dot and name. The other calendars stay. Changing a chip does not call the calendar API again. The same subset is on the 4-week grid, the week columns, and the day list.

**Why this priority**: A category chip hides several people at once. The wall needs to turn one calendar off.

**Independent Test**: In demo mode, today's cell shows "Standup" (Alex, `#6366f1`) and "Family dinner" (Family, `#10b981`). Turn off Alex. "Standup" and "Deep work block" are gone. "Client call" (Jordan), "Family dinner", and "School pickup" stay. Alex's dot is dimmed. The calendar request is still `GET /api/calendar` with no query string. Open that day and that week: the same events are hidden. Turn Alex back on and those events return.

**Acceptance Scenarios**:

1. **Given** the view machine, **When** it first mounts, **Then** `activeFilters` is `[]` and `lastInteractionAt` is `0`. Every event is eligible. Every calendar chip is `aria-pressed`.
2. **Given** every calendar is shown, **When** Alex is toggled, **Then** events with `calendarId` `alex` are hidden and Alex is not `aria-pressed`. Jordan, Family, and School events stay, in their own colors. `lastInteractionAt` stays `0`.
3. **Given** Alex is hidden, **When** Alex is toggled again, **Then** `activeFilters` returns to `[]` and every calendar is visible again. **When** the last remaining calendar is toggled off, **Then** no events are drawn and the day body says "No events", not "Calendar unavailable".
4. **Given** any chip change, **When** the network is observed, **Then** the calendar URL is `/api/calendar` with no query string. The chip does not add a search parameter or a new SWR key.
5. **Given** a calendar is hidden, **When** the operator opens a day, opens that week, or returns to 4 weeks, **Then** the same calendar stays hidden. The machine does not read `idleTimeoutMs`.

---

### Edge Cases

- **Header**: Do not edit `DashboardShell.tsx`, `ClockWidget.tsx`, `WeatherWidget.tsx`, or `LockControl.tsx`. Lock stays far right in the header, hidden in demo mode, confirm-then-`POST /api/auth/lock`.
- **View chrome**: Do not edit `ViewToolbar.tsx`. Do not change the 4-week math, the chevron column, `dayHeading`, the week hour grid, the all-day band, the day list structure, or the one-time week `scrollTop`. The only change inside month, week, and day is which events reach the existing placement code.
- **Empty filter**: `[]` means every calendar is shown. It does not mean show nothing. Do not preload `activeFilters` with every calendar id.
- **One calendar, one chip**: Chips are built from distinct `calendarId` values on the loaded events. A deployment with one feed shows one chip. A calendar with no events in the payload has no chip.
- **Color**: The dot uses `calendarColor`. The event chip keeps that same hex on its left border. Do not paint a chip with a category color.
- **Hide one calendar**: Toggling a shown calendar removes its `calendarId` from the visible set. The stored list is the calendars that remain, in first-seen order. When every calendar is visible again, store `[]`. When the last visible calendar is turned off, store a sentinel that matches no `calendarId`, so the views draw no events.
- **Unavailable vs filtered-empty**: "Calendar unavailable" only when the fetch errors and `events` is missing. `events: []`, and a filter that matches nothing, keep the view chrome and use the existing empty presentation ("No events" on day view; no chips on the grid).
- **Idle**: Do not write a timestamp into `lastInteractionAt`. Do not read `IDLE_TIMEOUT_MS` or `idleTimeoutMs`. Do not return to month view on a timer. Phase 8 owns that.
- **Secrets**: The client does not import `lib/config.ts` (that module carries `icsUrl`). Chip identity is `calendarId`, `calendarLabel`, and `calendarColor` from the event payload. No PIN, ICS URL, latitude, or longitude is added to props or bundles. `icsUrl` stays off `UnifiedEvent` and `CalendarApiResponse`.
- **Hit targets**: The filter row is 28px tall so the calendar keeps the height the 44px category pills were taking. No hover-only affordance. No Framer Motion on the bar.

## Requirements

### Functional Requirements — Filter model

- **FR-001**: `lib/calendar-filters.ts` is client-safe. It may import the `UnifiedEvent` type only. It MUST NOT import `lib/config.ts`, `lib/calendar-engine.ts`, `lib/calendar-cache.ts`, or any weather module. It exports `calendarsFromEvents`, `isCalendarShown`, `eventsMatchingFilters`, and `toggleCalendar`.
- **FR-002**: `calendarsFromEvents` returns one `{ id, label, color }` per distinct `calendarId`, in first-seen order, using that event's `calendarLabel` and `calendarColor`. `eventsMatchingFilters` returns the input events, in the same order, when `activeFilters` is `[]`. Otherwise it returns events whose `calendarId` is in `activeFilters`. A show-none sentinel returns no events.
- **FR-003**: `toggleCalendar` hides a shown calendar and shows a hidden one. From `[]`, hiding one calendar stores the other calendar ids in first-seen order. Showing the last hidden calendar returns `[]`. Hiding the last visible calendar stores the show-none sentinel.
- **FR-004**: `CalendarViewState` in `lib/types/ui-state.ts` is not rewritten. `activeFilters` stays `string[]`. This phase writes calendar ids, or `[]`, or the show-none sentinel.
- **FR-005**: `components/calendar/FilterBar.tsx` is a Client Component. Props are `activeFilters: string[]` and `onChange: (activeFilters: string[]) => void`. It reads calendars through the existing `useCalendar` hook (same `/api/calendar` key, no query string). The root is a group named "Filters", `h-7 shrink-0 overflow-hidden`, one row, `px-6`, no wrap. The visible label is `Filters:`. Each calendar is a button with a filled dot in `calendarColor` and the `calendarLabel`. `aria-pressed` is true while that calendar is shown. A hidden calendar is dimmed. The row MUST NOT set `overflow` to `auto` or `scroll`.
- **FR-006**: `CalendarViewMachine` keeps the initial state `mode: "month"`, `anchorDate: ""`, `activeFilters: []`, `lastInteractionAt: 0`. It renders `FilterBar` above the active view. `onChange` replaces `activeFilters` only. `lastInteractionAt` stays `0`.
- **FR-007**: `showMonth`, `showWeek`, `openWeek`, `stepDay`, `stepWeek`, and `openDay` preserve the current `activeFilters`. They continue to set `lastInteractionAt` to `0`. They do not read `idleTimeoutMs`.
- **FR-008**: `MonthView`, `DayView`, and `WeekView` each gain a required `activeFilters: string[]` prop. Each still calls `useCalendar` with no query string. Before the existing overlap tests, the `events` array is replaced by `eventsMatchingFilters(events, activeFilters)`. All-day and timed placements in week and day both use that filtered array. No other layout, toolbar, scroll, or date-heading behavior changes.
- **FR-009**: `app/page.tsx` stays a Server Component and keeps the current shell props. Do not pass `idleTimeoutMs`, latitude, longitude, calendar sources, or `icsUrl`. Do not edit `lib/hooks/useCalendar.ts`, `app/api/calendar/route.ts`, `lib/date-utils.ts`, `lib/demo-data.ts`, or `app/globals.css`.

### Key Entities / Data Contracts

No new response type. The bar consumes the Phase 2 envelope and the Phase 1 event field. `icsUrl` MUST NOT appear on either.

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
  activeFilters: string[]; // [] = every calendar; else the calendarIds still shown
  lastInteractionAt: number; // stays 0 in this phase
}
```

This phase reads `calendarId`, `calendarLabel`, and `calendarColor` to build the legend and to decide visibility. It still does not display `description`.

### Shell composition

```text
app/page.tsx (server, unchanged)
  .kiosk-frame / .kiosk-stage
    DashboardShell (unchanged)
      header: ClockWidget | WeatherWidget | LockControl
      main: CalendarViewMachine
        FilterBar          28px, Filters: dot + calendarLabel per calendarId
        month | week | day flex-1, existing navigation and geometry
```

PIN-gate, `/api/calendar`, and `/api/weather` stay as they are. The shell does not start an idle timer.

## Success Criteria

- **SC-001**: At 1180×820 the filter row is one 28px line under the unchanged header on the 4-week, week, and day views, labeled "Filters:" with one colored calendar per loaded calendar. The document does not scroll. At 1366×1024 and 1920×1080 the stage fills the viewport and the filter row stays one line.
- **SC-002**: Turning off Alex on today's demo data hides "Standup" and "Deep work block" and keeps "Client call" (`#ec4899`), "Family dinner" (`#10b981`), and "School pickup" (`#8b5cf6`). Alex's dot uses `#6366f1`, the same hex as the Standup chip border. The calendar request stays `GET /api/calendar` with no query string, and the toggle does not itself send another calendar request.
- **SC-003**: `activeFilters` survives opening a day, opening a week, and returning to 4 weeks. Turning the hidden calendar back on restores its events. Hiding every calendar shows an empty day ("No events") and does not show "Calendar unavailable".
- **SC-004**: Phase 6 navigation is unchanged: today-anchored 4-week grid, 44px week chevron, day cells open that day, day toolbar is Week / date with chevrons / "4 weeks", week toolbar is empty left / range with chevrons / "4 weeks", and today plus the first of a month keep the month name in the cell.
- **SC-005**: `lastInteractionAt` stays `0`. Nothing reads `idleTimeoutMs`. Demo mode still hides the lock control. The week time grid is still the only scroller. Client props and bundles add no PIN, no ICS URL, and no latitude/longitude.

## Assumptions

- The header row in `DashboardShell` is full at 1180×820, so the 44px main-column row is the placement that keeps zero document scroll. The centered 1180×820 island is not the product; `.kiosk-stage` already fills the three defined viewports.
- `useCalendar` stays deduped by SWR on `/api/calendar`. Filtering in each mounted view does not lift the hook and does not change its key.
- Demo `generateDemoEvents()` already marks Standup and Deep work and Client call as `person`, Family dinner as `shared`, and School pickup as `external`. This phase does not edit that generator. Utility has no demo events.
- The API window (−7 / +45) is unchanged. Filters do not narrow the fetch window.
- Default config remains `America/New_York`, `weekStartDay` `0`, and `timeFormat` `12h`.
- A 44px row leaves the week time grid taller than its box at 1180×820, so contained scroll still has somewhere to move.

## Out of Scope (this specification)

- Idle view-reset back to month view (Phase 8), including writing a timestamp to `lastInteractionAt` or reading `IDLE_TIMEOUT_MS`
- Per-calendar chips are this phase. Do not add an "Add event" control.
- A refetch, a query parameter, or a change to `CalendarApiResponse`, `useCalendar`'s key, or `app/api/calendar/route.ts`
- Changes to the PIN-gate, `LockControl`, the clock, the weather widget, `DashboardShell`, `ViewToolbar`, the kiosk CSS, the month-grid geometry, the week time grid, or the day-list structure
- Creating or editing events
- Hiding a chip when its category has zero events in the payload

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | The filter row is 28px under the full header; 1180×820, 1366×1024, and 1920×1080 keep zero document scroll; the only scroller remains the week time grid with `overscroll-behavior: contain` |
| II Privacy | Chips use `calendarId`, `calendarLabel`, and `calendarColor` from the event payload; no `icsUrl`, PIN, or coordinates; `lib/config.ts` stays off the client |
| III Appliance | Existing 600s SWR hook, no new request on toggle, no `setInterval`, no idle timer, no session lock, filtered last-known events or the existing unavailable line |
