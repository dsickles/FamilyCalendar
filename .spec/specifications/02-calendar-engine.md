# Specification: Calendar Data Engine (Server-Side)

**Feature ID**: `02-calendar-engine`
**Created**: 2026-09-21
**Status**: Implemented 2026-09-21. Human review next. Do not start Phase 3 in this thread.
**Input**: Implementation Master Plan, Phase 2 (Calendar Data Engine)
**Constitution check**: Principles II (ICS URLs server-side only; PIN-gate already covers `/api/calendar`; demo mode uses built-in sample data) and III (8s per-feed timeout, `Promise.allSettled`, 600s in-memory cache, stale-cache over a blank wall)
**Project context**: `.spec/project.md`
**Depends on**: `.spec/specifications/01-core-and-security.md` (types, `lib/config.ts`, `generateDemoEvents()`, PIN-gate). Do not reopen PIN-gate work unless it is broken.

This specification covers only the server-side calendar pipeline: in-memory cache, date-window helpers, ICS fetch/parse, RRULE expansion, timezone normalization, a committed mock fixture, and `GET /api/calendar` returning unified events. Weather, SWR hooks, and month/week/day UI are out of scope.

## User Scenarios & Testing

### User Story 1 — Clone still gets sample events from the API (Priority: P1)

A portfolio visitor or developer runs the app with no `CAL_*_URL` values. `GET /api/calendar` succeeds without a PIN and returns the existing demo generator output (`generateDemoEvents()`), not a live ICS fetch.

**Why this priority**: Demo mode is a constitution invariant. Phase 2 must not force a feed URL or a PIN onto public clones.

**Independent Test**: Omit `.env.local` (or leave all `CAL_*_URL` empty). `GET /api/calendar` is 200. Body events match `generateDemoEvents()` shape and count band (~25–30). No outbound HTTP to calendar hosts.

**Acceptance Scenarios**:

1. **Given** `isDemoMode() === true`, **When** a client requests `GET /api/calendar`, **Then** the handler returns demo `UnifiedEvent[]` from `generateDemoEvents()` and MUST NOT fetch ICS, parse `mock.ics` as a live feed, or read `CAL_*_URL`.
2. **Given** demo mode, **When** the response is inspected, **Then** no field is named `icsUrl` and no ICS URL string appears in the JSON.
3. **Given** demo mode, **When** the same request is made without a `dash_session` cookie, **Then** it still succeeds (PIN-gate already skips demo; this spec does not change middleware).

---

### User Story 2 — Live kiosk receives expanded events from ICS feeds (Priority: P1)

An operator has set at least one `CAL_*_URL` (and the existing PIN-gate). The server fetches each enabled feed, parses it with `node-ical`, expands recurrences inside a sliding window, normalizes timestamps to the dashboard timezone, and returns `UnifiedEvent[]` for the wall to consume later.

**Why this priority**: This is the Phase 2 product: private family calendars become a single server-owned event list. Client JavaScript never sees feed URLs.

**Independent Test**: Live mode with a local fixture URL (`fixture:mock.ics`) or a dummy HTTP ICS. After unlock, `GET /api/calendar` returns unified events. Recurring series are expanded. All-day flags are correct. Feed URLs are absent from the JSON.

**Acceptance Scenarios**:

1. **Given** live mode and at least one enabled `CalendarSource`, **When** `GET /api/calendar` runs, **Then** the engine fetches only `enabled` sources, parses VEVENT data, and returns events whose `startTime` falls in the window **today−7 days through today+45 days** (dashboard timezone).
2. **Given** a VEVENT with an RRULE, **When** the engine expands it, **Then** occurrences are produced with `rrule.between(windowStart, windowEnd)` (UNTIL and COUNT honored by the library), `isRecurring` is true, and each `id` is `${calendarId}::${uid}::${occurrenceDate.toISOString()}`.
3. **Given** EXDATE entries, **When** occurrences are built, **Then** matching instances are omitted (date-only compare for all-day; exact instant for timed events).
4. **Given** a RECURRENCE-ID override, **When** the master series is expanded, **Then** the matching occurrence is replaced with the override; an orphaned override (no master in the feed) is kept as a standalone event.
5. **Given** `DTSTART;VALUE=DATE` (no time), **When** the event is normalized, **Then** `isAllDay` is true, `startTime` is midnight in the dashboard timezone on that date, and `endTime` is midnight the following local day.
6. **Given** the JSON response, **When** it is searched for calendar URLs or the key `icsUrl`, **Then** neither appears. Payloads MAY include `calendarId`, `calendarLabel`, `calendarColor`, and `calendarCategory` only.

---

### User Story 3 — One dead feed does not blank the wall (Priority: P1)

Feeds time out, 404, or contain malformed ICS. The appliance must still return events from healthy feeds, and if every fetch fails it must return the last successful payload even when the cache TTL has expired.

**Why this priority**: Constitution III: a hung feed must not stall the kiosk; partial or stale data beats an empty wall.

**Independent Test**: Point one source at a blackhole/invalid URL and another at `fixture:mock.ics`. The API still returns fixture events within ~8s per failed feed. With cache primed then all URLs broken, a later GET returns the prior events with `stale: true`.

**Acceptance Scenarios**:

1. **Given** multiple enabled feeds, **When** they are fetched, **Then** each uses an 8-second `AbortController` timeout and `Promise.allSettled` so one failure cannot block the others.
2. **Given** a timeout, network error, or `parseICS` throw, **When** other feeds succeed, **Then** the response includes those events and error metadata for the failed **calendar id/label** (never the ICS URL).
3. **Given** every feed fails and a prior cache entry exists, **When** `GET /api/calendar` runs, **Then** the cached `UnifiedEvent[]` is returned with `stale: true` even if `expiresAt` is in the past.
4. **Given** every feed fails and no cache exists, **When** `GET /api/calendar` runs, **Then** the handler still returns 200 with an empty `events` array and error metadata — not a 5xx that would take the wall down.

---

### User Story 4 — Repeat requests within ten minutes hit memory cache (Priority: P2)

The kiosk will poll this route. The server must not refetch every ICS on each call. Cache TTL follows `CACHE_REVALIDATE_SECONDS` (default 600).

**Why this priority**: Appliance runtime: bounded memory, predictable load on Google/Apple ICS hosts, overnight stability.

**Independent Test**: Two GETs within TTL. Second is a cache hit (server log line `HIT`, no second fixture/HTTP read). After TTL, a MISS refetches.

**Acceptance Scenarios**:

1. **Given** a populated cache whose `expiresAt` is in the future, **When** `GET /api/calendar` runs, **Then** the engine is not invoked and the cached events are returned (`cache: "hit"`).
2. **Given** a cache miss or expiry with at least one healthy feed, **When** the engine completes, **Then** the combined `UnifiedEvent[]` is stored with TTL from `getDashboardConfig().cacheRevalidateSeconds` (default 600).
3. **Given** cache keys, **When** they are constructed, **Then** they are derived from **feed identity + date window** (hash of enabled source identities/URLs plus window start/end), not from unbounded query variance. Phase 2 MUST NOT accept arbitrary client window query params.
4. **Given** expired entries, **When** get/set runs, **Then** expired keys are dropped so the `Map` cannot grow without bound.

---

### User Story 5 — Parser can be tested without a real family feed (Priority: P2)

An operator or agent can exercise `node-ical` locally using a committed mock ICS file that contains no private family data.

**Why this priority**: Public repo cannot contain live ICS URLs. Live-mode parser tests still need a feed.

**Independent Test**: `lib/__fixtures__/mock.ics` exists with 10–15 events (single, all-day, daily RRULE, weekly RRULE + EXDATE). Live mode `CAL_<ID>_URL=fixture:mock.ics` (plus PIN) yields expanded events from that file.

**Acceptance Scenarios**:

1. **Given** `lib/__fixtures__/mock.ics`, **When** it is read, **Then** it contains 10–15 VEVENTs mixing timed singles, all-day, recurring daily, and recurring weekly with at least one EXDATE. No real household names, addresses, or live calendar hosts.
2. **Given** an enabled source whose `icsUrl` is `fixture:mock.ics` (scheme `fixture:` + basename only), **When** the engine runs, **Then** it reads `lib/__fixtures__/mock.ics` from disk and MUST NOT treat it as HTTP and MUST NOT allow path traversal (`..`, absolute paths).
3. **Given** `https:` / `http:` `icsUrl` values, **When** the engine runs, **Then** it uses server-side `fetch` (no browser CORS).

---

### Edge Cases

- **PIN-gate**: Already implemented in Phase 1.5. Live unauthenticated `GET /api/calendar` remains 401 (or redirect for documents). This spec MUST NOT add `/api/calendar` to the middleware skip list and MUST NOT retune unlock/lock/rate-limit.
- **Demo vs fixture**: No `CAL_*_URL` → demo generator, no PIN. Any `CAL_*_URL` including `fixture:mock.ics` → live mode (PIN-gated) and the engine path.
- **Disabled sources**: `enabled === false` (empty URL) are skipped.
- **Floating times (no TZID)**: Treat as dashboard timezone (`TIMEZONE`, default `America/New_York`); do not assume UTC.
- **Embedded VTIMEZONE / named TZID**: Trust `node-ical` when it resolves the zone; otherwise interpret via `Intl` with the IANA name, else dashboard TZ.
- **DST**: No manual UTC offset arithmetic. Serialize instants as ISO 8601; format with `Intl.DateTimeFormat` + dashboard `timeZone`.
- **Long RRULE series**: Window (−7 / +45) caps expansion (~52 daily occurrences max).
- **Malformed ICS**: try/catch per feed; skip that feed; continue.
- **Logging**: Log calendar id + failure/cache reason only. MUST NOT log ICS URLs, PIN material, or event payloads.
- **CORS**: Irrelevant; fetches are server-side only.
- **Client SWR / views**: Not in this phase. Filter chips later subset this payload; they must not refetch ICS.

## Requirements

### Functional Requirements — Cache

- **FR-001**: `lib/calendar-cache.ts` MUST implement an in-memory
  `Map<string, { data: UnifiedEvent[]; expiresAt: number }>` with TTL
  `get` / `set` / `invalidate`. Default TTL is 600 seconds from
  `cacheRevalidateSeconds`.
- **FR-002**: Cache keys MUST be a hash of enabled feed identity plus
  the date-window bounds, not raw request query strings.
- **FR-003**: `get` MUST return `null` on miss, return data on fresh hit,
  and expose a way for the route to read **expired** last-known data
  when every feed fails (stale serve). Expired keys MUST be pruned on
  write and on fresh-hit reads so the map stays bounded.

### Functional Requirements — Date window & helpers

- **FR-004**: `lib/date-utils.ts` MUST export:
  `getWindowStart(today, offsetDays)`,
  `getWindowEnd(today, offsetDays)`,
  `getWeekBounds(date, weekStartDay)`,
  `getDayBounds(date)`,
  `formatTime(date, format)`,
  `isSameDay(a, b)`,
  `getWeeksInRange(start, end)`.
  Window helpers used by the engine MUST interpret "today" in the
  dashboard timezone.
- **FR-005**: The calendar engine's fetch window MUST be **−7 days**
  through **+45 days** from dashboard-local today. The API MUST compute
  this server-side. Custom window query parameters are out of scope
  (unbounded cache keys).

### Functional Requirements — Engine

- **FR-006**: `lib/calendar-engine.ts` MUST export
  `fetchAndParseCalendars(sources: CalendarSource[], windowStart: Date, windowEnd: Date): Promise<UnifiedEvent[]>`
  (plus error metadata the route can serialize). It MUST use
  `Promise.allSettled` across feeds.
- **FR-007**: HTTP(S) feeds MUST be fetched with `fetch` and an 8-second
  `AbortController` timeout. `icsUrl` MUST be read only from
  `CalendarSource` on the server.
- **FR-008**: ICS text MUST be parsed with `node-ical` async `parseICS`.
  Parse failures skip that feed.
- **FR-009**: For each VEVENT with an rrule, the engine MUST expand with
  `rrule.between(windowStart, windowEnd)`, then apply EXDATE filtering
  and RECURRENCE-ID overrides as specified in User Story 2.
- **FR-010**: All occurrence timestamps MUST be normalized to the
  dashboard timezone before building `UnifiedEvent.startTime` /
  `endTime` (ISO 8601). `Intl.DateTimeFormat` with explicit `timeZone`
  from `getDashboardConfig().timezone` is the display/normalize tool;
  do not add/subtract raw offsets.
- **FR-011**: Output MUST be sorted by `startTime` ascending.
- **FR-012**: Deterministic `UnifiedEvent.id` MUST be
  `` `${calendarId}::${uid}::${occurrenceDate.toISOString()}` ``.
  `icsUrl` MUST NOT appear on `UnifiedEvent` or the HTTP envelope.
- **FR-013**: `fixture:<basename>` URLs MUST resolve only to files
  inside `lib/__fixtures__/`. Other schemes use HTTP(S) fetch.

### Functional Requirements — API route

- **FR-014**: `app/api/calendar/route.ts` `GET` MUST: check cache → on
  miss call the engine → cache successful combined results → return JSON.
  Demo mode MUST short-circuit to `generateDemoEvents()` without the
  ICS engine.
- **FR-015**: The JSON envelope MUST be:

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
  ```

  Master Plan curl `.length` is replaced by `.events.length` so `stale`
  and per-feed errors can exist without leaking URLs. HTTP status is
  **200** for empty, partial, stale, and full success.
- **FR-016**: Response MUST include
  `Cache-Control: s-maxage=<cacheRevalidateSeconds>, stale-while-revalidate=300`
  (default s-maxage 600).
- **FR-017**: The route stays behind the existing PIN-gate. This phase
  MUST NOT edit unlock, lock, rate-limit, or middleware skip lists
  unless a regression is proven.
- **FR-018**: Cache HIT / MISS / STALE MAY be logged as a single line
  without URLs or event bodies.

### Functional Requirements — Fixture

- **FR-019**: `lib/__fixtures__/mock.ics` MUST contain 10–15 events as
  in User Story 5. It is the only committed ICS. It MUST NOT include
  live family feed hosts.

### Key Entities / Data Contracts

`CalendarSource`, `RawIcsEvent`, and `UnifiedEvent` are already binding
in `01-core-and-security.md` and MUST NOT be rewritten. Phase 2 adds
`CalendarApiResponse` (FR-015) in `lib/types/calendar.ts` (or re-exported
from the route module — one canonical copy).

Occurrence mapping reminder:

| ICS | UnifiedEvent |
|-----|--------------|
| UID | `originalUid` |
| SUMMARY | `title` |
| DESCRIPTION | `description` (empty string if absent) |
| LOCATION | `location` (empty string if absent) |
| DTSTART / occurrence | `startTime` ISO |
| DTEND / duration | `endTime` ISO |
| VALUE=DATE | `isAllDay: true` |
| presence of RRULE | `isRecurring: true` |
| source metadata | `calendarId`, `calendarLabel`, `calendarColor`, `calendarCategory` |

### Calendar pipeline

```text
GET /api/calendar
  demo? → generateDemoEvents() → CalendarApiResponse
  live + cache fresh? → cached events (cache: hit)
  live + miss → fetchAndParseCalendars(enabled sources, −7 / +45)
                  per feed: 8s timeout, parseICS, RRULE expand,
                  EXDATE, RECURRENCE-ID, TZ normalize
                → sort by startTime
                → set cache
                → 200 CalendarApiResponse
  all feeds failed + last-known? → stale: true (even if TTL expired)
```

ICS URLs never leave the server. PIN-gate is unchanged.

## Success Criteria

- **SC-001**: In demo mode, `GET /api/calendar` returns demo events
  without a session cookie and without contacting external calendar
  hosts.
- **SC-002**: In live mode, the same route returns expanded
  `UnifiedEvent` objects for the −7 / +45 window, including recurring
  occurrences, with no `icsUrl` in the payload.
- **SC-003**: A second request within 10 minutes is served from memory
  (no duplicate ICS fetch).
- **SC-004**: One timed-out or malformed feed still yields events from
  healthy feeds within the per-feed 8-second budget.
- **SC-005**: When all feeds fail after a successful fetch, the previous
  event list is still returned (`stale: true`).
- **SC-006**: Client-destined types and the calendar JSON contain no PIN
  and no ICS URLs (bundle + payload gate).
- **SC-007**: `mock.ics` in git is sample-only; real `CAL_*_URL` values
  remain in `.env.local` only.

## Assumptions

- `node-ical` is already a runtime dependency from Phase 1.
- `UnifiedEvent` / `CalendarSource` / `generateDemoEvents()` /
  `getCalendarSources()` / `isDemoMode()` / PIN-gate are already
  implemented and in bounds.
- Dashboard timezone default remains `America/New_York`.
- QNAP is a single Node process; in-memory cache reset on restart is
  acceptable (same class of limitation as the PIN rate limiter).
- Phase 4 SWR will consume this envelope; this phase does not mount a
  client hook or draw events.
- `fixture:` is the local live-mode test seam specified here; it was
  implied by Master Plan step 2.5 (mock ICS without real feeds).

## Out of Scope (this specification)

- Weather engine / `/api/weather` (Phase 3)
- `lib/hooks/useCalendarData.ts` and any SWR UI wiring (Phase 4+)
- Month / week / day views, filter chips, idle view-reset (Phases 5–8)
- PIN-gate, unlock UI, relock, rate-limit (done in Phase 1.5)
- Real family ICS URLs in the repository
- Client-supplied date-window query parameters
- Recurring-event create/edit (the wall is view-only)

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | No UI in this phase; kiosk CSS unchanged |
| II Privacy | ICS URLs server-only; PIN-gate unmodified; demo uses `generateDemoEvents()`; no `icsUrl` on DTOs |
| III Appliance | 8s timeout, `allSettled`, 600s TTL Map, prune keys, stale cache over blank, no event-payload logs |
