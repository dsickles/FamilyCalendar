# Tasks: Calendar Data Engine (Server-Side)

**Input**: `.spec/specifications/02-calendar-engine.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: Implementation Master Plan — Phase 2
**Status**: Implemented 2026-09-21. T021–T026 complete. Human review next. Do not start Phase 3 until a new chat explicitly asks for it.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate copied from the Master Plan (envelope field
`.events.length` instead of a bare array `.length`). That gate MUST pass
before Phase 3.

**Organization**: One implementation slice (Phase 2). PIN-gate, types,
`lib/config.ts`, and `generateDemoEvents()` already exist — do not
revisit them unless they are broken.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US5]**: Maps to user stories in the specification
- Step IDs (`2.1` … `2.6`) are the Master Plan IDs
- Task IDs continue from Phase 1.5 (`T020`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). Calendar engine
modules are **server-only**. Do not import them from Client Components.

**Do not start Phase 3 (weather) in the same chat as this implementation.**

---

## Phase 2: Calendar Data Engine

**Purpose**: Working `GET /api/calendar` that returns `UnifiedEvent[]`
inside `CalendarApiResponse` from demo data, `fixture:mock.ics`, or real
ICS feeds, with RRULE expansion, TZ normalize, and a 10-minute memory cache.

**Master Plan goal**: Working `/api/calendar` endpoint that returns
`UnifiedEvent[]` from real or mock `.ics` feeds.

- [x] T021 [P] [US4] Step 2.1 — Implement calendar cache in
      `lib/calendar-cache.ts`:
      `Map<string, { data: UnifiedEvent[]; expiresAt: number }>` with
      TTL `get` / `set` / `invalidate`. Key = hash of enabled feed
      identity + date window (not unbounded query strings). `get` returns
      fresh data; provide expired last-known read for stale serve; prune
      expired keys on set/fresh-get. TTL from
      `getDashboardConfig().cacheRevalidateSeconds` (default 600).
      MUST NOT store ICS URLs in values. File: `lib/calendar-cache.ts`.
- [x] T022 [P] [US2] Step 2.2 — Implement date utilities in
      `lib/date-utils.ts`: `getWindowStart(today, offsetDays)`,
      `getWindowEnd(today, offsetDays)`, `getWeekBounds(date, weekStartDay)`,
      `getDayBounds(date)`, `formatTime(date, format)`, `isSameDay(a, b)`,
      `getWeeksInRange(start, end)`. Window helpers MUST use dashboard
      timezone for "today". Engine window is −7 / +45 days. File:
      `lib/date-utils.ts`.
- [x] T023 [P] [US5] Step 2.5 — Add mock ICS fixture
      `lib/__fixtures__/mock.ics` with 10–15 VEVENTs: timed singles,
      all-day (`DTSTART;VALUE=DATE`), recurring daily, recurring weekly
      with at least one EXDATE (include a RECURRENCE-ID override if
      practical). Sample data only — no real family names, addresses, or
      live calendar hosts.
- [x] T024 [US2] [US3] [US5] Step 2.3 — Implement calendar engine in
      `lib/calendar-engine.ts`:
      `fetchAndParseCalendars(sources, windowStart, windowEnd)` using
      `Promise.allSettled`. Per enabled source: (a) `fixture:` basename
      → read `lib/__fixtures__/` only (reject `..` / absolute paths);
      otherwise `fetch` ICS with 8s `AbortController`, (b) `node-ical`
      async `parseICS` in try/catch, (c) RRULE `between(windowStart,
      windowEnd)`, EXDATE filter, RECURRENCE-ID overrides (orphans as
      standalone), (d) normalize to dashboard TZ via `Intl` — floating
      times = dashboard TZ; all-day = local midnight → next midnight,
      (e) `UnifiedEvent` with id
      `` `${calendarId}::${uid}::${occurrenceDate.toISOString()}` ``,
      (f) sort by `startTime` ascending. Return events plus per-feed
      errors `{ calendarId, calendarLabel, reason }` — never `icsUrl`.
      Log id + reason only, no payloads/URLs. Depends on T021–T023 types
      already in `lib/types/calendar.ts` and `lib/config.ts`. File:
      `lib/calendar-engine.ts`.
- [x] T025 [US1] [US2] [US3] [US4] Step 2.4 — Implement
      `app/api/calendar/route.ts` `GET`: if `isDemoMode()` return
      `generateDemoEvents()` envelope (`stale: false`, `errors: []`,
      `cache: "miss"`) and skip ICS. Else: fresh cache → `cache: "hit"`;
      miss → engine → `set` cache → `cache: "miss"`; all feeds failed
      with last-known → `stale: true`, `cache: "stale"` even if TTL
      expired; all failed with no cache → 200 `{ events: [], ... }`.
      Envelope `CalendarApiResponse` (add type to `lib/types/calendar.ts`,
      one copy). Header
      `Cache-Control: s-maxage=<cacheRevalidateSeconds>, stale-while-revalidate=300`.
      Optional one-line HIT/MISS/STALE log. Do **not** change
      `middleware.ts` or auth routes. File: `app/api/calendar/route.ts`,
      `lib/types/calendar.ts`.
- [x] T026 [US1] [US2] [US4] [US5] Step 2.6 — Verification only (no new
      product files): exercise `GET /api/calendar` per the gate below
      (`curl` / `fetch`). Confirm `.events.length`, RRULE expansion from
      `mock.ics`, cache hit on the second call, demo vs live, and the
      bundle/payload gate (no `icsUrl`). Windows-friendly: `curl.exe`.

### Phase 2 Verification (Master Plan)

`GET /api/calendar` returns JSON whose `events` array is `UnifiedEvent[]`.
Recurring events are correctly expanded. Second request within 10 minutes
hits cache (console log `HIT`).

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Demo API | No `CAL_*_URL` → `GET /api/calendar` is 200 without a cookie; `events` ~25–30; no outbound ICS fetch |
| Live gating | PIN + any `CAL_*_URL` → unauthenticated GET is 401 (existing middleware; do not "fix" unless broken) |
| Fixture parse | Live `CAL_*_URL=fixture:mock.ics` + session → events from mock ICS; weekly/daily recurrences expanded inside −7 / +45 |
| Envelope | Body is `CalendarApiResponse`; count via `.events.length`; no `icsUrl` key or ICS URL strings |
| Sort / ids | `events` sorted by `startTime`; ids match `` calendarId::uid::occurrenceISO `` |
| All-day | VALUE=DATE events have `isAllDay: true` and local midnight bounds |
| Cache hit | Second GET within TTL does not re-read the fixture/HTTP; log or `cache: "hit"` |
| Cache TTL | Default 600s; `Cache-Control` includes `s-maxage=600` (or configured value) and `stale-while-revalidate=300` |
| Partial feeds | One bad URL + one fixture → 200 with fixture events + error metadata for the bad **id** only |
| Stale serve | After a successful fetch, break all feeds → 200 with prior events and `stale: true` |
| Timeout | Hung feed fails in ≤ 8s and does not block the other feed |
| Bundle / secret | Client bundles and calendar JSON have no PIN and no ICS URLs; `mock.ics` has no live family hosts |
| PIN-gate untouched | `middleware.ts` skip list unchanged; `/api/calendar` still protected in live mode |

**Do not start Phase 3 (weather) until this gate passes and a new chat is opened.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phase 1 / 1.5 complete (types, config, demo data, PIN-gate).
- **T021, T022, T023**: Parallel (different files).
- **T024**: Depends on T021–T023 (engine uses cache helpers only if the
  route owns cache; engine itself needs date-utils + fixture scheme).
- **T025**: Depends on T024 + T021 + demo-data + `isDemoMode()`.
- **T026**: Depends on T025 + T023.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Demo API | T025 | T025 in demo env |
| US2 Live ICS → UnifiedEvent | T022, T023, T024, T025 | T025 + fixture |
| US3 Partial / stale | T021, T024, T025 | T025 with a bad feed |
| US4 10 min cache | T021, T025 | Two GETs within TTL |
| US5 mock.ics | T023, T024 | T025 with `fixture:mock.ics` |

### Parallel Opportunities

```text
After spec approval + "implement Phase 2":
  T021, T022, T023 in parallel
  then T024 (engine)
  then T025 (route)
  then T026 (verification gate)
```

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/02-calendar-engine.md`.
2. Execute T021–T026 only after the explicit instruction
   **implement Phase 2**.
3. Run Phase 2 Verification → stop if any check fails.
4. Stop. Do not implement `/api/weather` or UI widgets.

### MVP increment for this feature

US1 (demo `GET /api/calendar`) plus US5/US2 (fixture parse) is the
smallest demonstrable slice. US3 and US4 are required before calling the
appliance runtime complete.

---

## Notes

- Step IDs match the Master Plan so reviews can diff task text against
  the plan table.
- Constitution gates (bundle, auth, uptime, secret) apply even when the
  Master Plan verification paragraph is shorter.
- Demo mode uses `generateDemoEvents()`; `mock.ics` is the live-mode
  parser fixture via `fixture:mock.ics`, not the public-clone path.
- Do not revisit PIN-gate, unlock UI, or relock unless a Phase 2 change
  regresses them.
- Master Plan `jq '.length'` is `.events.length` because the spec adds
  `stale` / `errors` without putting ICS URLs in the body.
