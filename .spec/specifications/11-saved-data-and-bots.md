# Specification: Saved Data and Bot Access

**Feature ID**: `11-saved-data-and-bots`
**Created**: 2026-10-27
**Status**: Draft, pending owner review. Implementation starts only on "implement Phase 11".
**Input**: Family wall redesign plan (decisions D1, D2, D4; "How bots update the wall"; constitution changes row III)
**Constitution check**: Principles III (PIN on the wall API, per-bot keys and scopes, data not markup, demo refuses writes, no secrets in bundles) and IV (store caps, stale over blank, bounded polling)
**Project context**: `.spec/project.md`
**Depends on**: `10-frame-shell.md`

The wall gets a server-side store, a PIN-gated data API for the wall and
the phone, and a keyed API (HTTPS and MCP) for bots. This phase ships the
plumbing plus the first real feature on it: **bot notes on Today**.
Shopping and To-dos (Phase 12) and Meals (Phase 13) add their operations to
the same store and APIs.

## User Scenarios & Testing

### User Story 1 — A bot posts a note and the wall shows it (Priority: P1)

Dan's bot calls `POST /api/bot/notes` with its key: "Pizza night! Grandma
arrives 4pm", until 8 PM. Within 30 seconds the Today banner shows it with
the bot's name, and it disappears at 8 PM.

**Why this priority**: It proves the store, the bot key, the wall API, and
polling end to end with the smallest feature.

**Independent Test**: Live mode with the memory store adapter in e2e, one
configured bot key with scope `notes`. Post a note; the wall shows it on the
next poll. Post with no key, a wrong key, or a key without `notes`: 401,
401, 403.

**Acceptance Scenarios**:

1. **Given** a key with scope `notes`, **When** the bot posts
   `{ text, until }`, **Then** the API returns 201 with the note, and the
   activity log gains "<Bot name> posted a note".
2. **Given** a note whose `until` is past, **When** the wall polls, **Then**
   the note is gone from the banner and the store prunes it on the next
   write.
3. **Given** the wall's dismiss button, **When** someone taps it, **Then**
   the note is dismissed for everyone and the log records "Wall dismissed
   a note".
4. **Given** `until` more than 7 days ahead, **When** the bot posts,
   **Then** the API returns 400.

### User Story 2 — The wall survives a store outage (Priority: P1)

**Independent Test**: Make the store adapter throw. The wall keeps the
last-known data, shows a small "Offline" mark on the rail, and recovers
when the store returns.

**Acceptance Scenarios**:

1. **Given** a loaded wall, **When** `GET /api/wall` fails, **Then** the
   wall keeps the last snapshot and marks it stale; it never blanks.
2. **Given** a cold wall and a failing store, **When** it loads, **Then**
   tabs that need saved data show an empty state with "Can't reach saved
   data" and calendar and weather still work.
3. **Given** a write while the store is down, **When** it fails, **Then**
   the caller gets 503 and the wall shows "Didn't save, try again".

### User Story 3 — A bot can only do what its key allows (Priority: P1)

**Independent Test**: Unit and e2e tests over the scope table.

**Acceptance Scenarios**:

1. **Given** `BOT_CHEF_SCOPES=meals,read`, **When** that key posts a note,
   **Then** the API returns 403 and nothing is written.
2. **Given** 61 requests in 10 minutes from one key, **When** the 61st
   arrives, **Then** it gets 429 with `Retry-After`.
3. **Given** a request body with HTML, **When** it is saved, **Then** it is
   stored as plain text and the wall renders it as text (no element
   created from it).
4. **Given** an MCP client with the same key, **When** it lists tools,
   **Then** it sees only tools within its scopes, and calling one behaves
   exactly like the HTTPS action.
5. **Given** demo mode, **When** any bot write arrives, **Then** it gets
   403 `{ error: "demo" }`.

### User Story 4 — Writes from two places don't clobber each other (Priority: P2)

**Independent Test**: Fire 20 concurrent operations at the store (memory
and file adapters, plus Upstash in an opt-in integration test). All 20 are
applied.

**Acceptance Scenarios**:

1. **Given** two writers changing the same collection at once, **When**
   both commit, **Then** both operations are applied, because writes are
   operations replayed on the latest state, not whole-document saves.
2. **Given** a version conflict, **When** a write retries 3 times and
   still conflicts, **Then** the caller gets 409 and nothing partial is
   saved.

### Edge Cases

- Store credentials missing in live mode: the wall still serves calendar
  and weather, `/api/health` reports `store: "unconfigured"`, and writes
  return 503.
- Clock skew on a bot: `until` is judged on the server clock.
- The same bot key configured twice: config load fails at startup with a
  clear message (no silent override).

## Requirements

### Functional Requirements — Store

- **FR-001**: `lib/store/` MUST define one `WallStore` interface:
  `read(): Promise<WallSnapshot>`, `version(): Promise<number>`, and
  `apply(op: WallOp, actor: Actor): Promise<WallSnapshot>`.
- **FR-002**: Three adapters MUST implement it:
  - **Upstash** (`@upstash/redis` REST), chosen when the Upstash REST URL
    and token are set (`KV_REST_API_URL`/`KV_REST_API_TOKEN` as the
    Vercel Marketplace sets them, or `UPSTASH_REDIS_REST_URL`/
    `UPSTASH_REDIS_REST_TOKEN`).
  - **File**, chosen when `STORE_FILE` is set (Docker). Atomic writes
    (write a temp file, then rename) behind an in-process mutex.
  - **Memory**, for unit and e2e tests only.
- **FR-003**: Data lives under the key prefix `wall:v1:` as one JSON
  document per collection (`shopping`, `todos`, `meals`, `notes`,
  `activity`) plus `wall:v1:version`. Upstash writes MUST be a
  compare-and-set on the version via one Lua script (`EVAL`), retried up to
  3 times.
- **FR-004**: `apply` MUST validate the op with its Zod schema, apply it to
  the latest state, enforce the caps in FR-005, prune expired items, append
  one activity entry, bump the version, and commit atomically.
- **FR-005**: Caps (constitution IV): shopping ≤ 200 items, ticked items
  pruned 24 hours after ticking; open to-dos ≤ 300, done to-dos pruned
  after 30 days; meals from 14 days back to 14 days ahead; notes expire by
  `until` (≤ 7 days); activity keeps the newest 200. A write that would
  exceed a count cap fails with 422 `{ error: "full", cap }`.
- **FR-006**: Text limits: names and titles ≤ 120 characters, a note ≤ 200,
  a to-do detail ≤ 2,000, a whole request body ≤ 32 KB. Control characters
  are stripped. No field is ever rendered as HTML.
- **FR-007**: Shared types move from the prototype to
  `lib/wall/types.ts` as binding contracts: `ShoppingItem`, `Todo`,
  `TodoNote`, `MealDay`, `Meal`, `BotNote`, `ActivityEntry`, and
  `WallSnapshot = { version, shopping, todos, meals, notes, activity }`.
  The prototype-only `seededFor` field is dropped.

### Functional Requirements — Operations in this phase

- **FR-008**: `note.post { text, until }` (`until` an ISO time ≤ 7 days
  ahead), `note.dismiss { id }`, and `today.read` (read-only: today's
  events, meals, open list, open to-dos, active notes). Phases 12 and 13
  add their own ops to the same union.
- **FR-009**: Every op MUST have a stable name, a Zod schema, a required
  scope, and a one-line activity text, all in one table
  (`lib/store/ops.ts`) that the wall API, the bot API, and the MCP tools
  are generated from.

### Functional Requirements — Wall and phone API (PIN)

- **FR-010**: `GET /api/wall` returns `WallSnapshot` with an `ETag` of the
  version. `If-None-Match` with the current version returns 304 after one
  version read.
- **FR-011**: `POST /api/wall` takes `{ op, args, by }`. `by` is "Wall" or
  the phone's remembered name (≤ 40 characters); the server records it as
  the actor. It MUST require `Content-Type: application/json` and an
  `Origin` equal to the site's own origin.
- **FR-012**: The wall MUST poll with SWR every 15 seconds while visible
  (`refreshWhenHidden: false`, `dedupingInterval` 10 seconds), so a phone
  or bot write appears within 30 seconds. Polling MUST NOT overlap.
- **FR-013**: Before choosing the final interval, this phase MUST check the
  Upstash free-tier command limit and record it in this spec. The wall's
  idle polling (one version read per poll) MUST stay under half of it.

### Functional Requirements — Bot API

- **FR-014**: Bot keys come from `BOT_<ID>_KEY`, `BOT_<ID>_NAME`, and
  `BOT_<ID>_SCOPES` (comma list of `notes`, `shopping`, `todos`, `meals`,
  `read`). Keys MUST be at least 32 characters and compared in constant
  time on their SHA-256 digests.
- **FR-015**: HTTPS: `POST /api/bot/<op>` with `Authorization: Bearer
  <key>` and the op's args as JSON; `GET /api/bot/today` for `today.read`.
  Answers: 401 without a valid key, 403 outside its scopes or in demo
  mode, 400 on a schema error (with the field path), 422 at a cap, 429 over
  the rate limit, 503 when the store is down.
- **FR-016**: MCP: `/api/mcp` serves the MCP Streamable HTTP transport,
  stateless, with the same Bearer key. Tools are generated from the op
  table, filtered by the key's scopes.
- **FR-017**: Rate limit: 60 requests per key per 10 minutes, counted in
  the store (Upstash `INCR` with expiry; memory for the file adapter).
- **FR-018**: `/api/bot/` and `/api/mcp` MUST be on the PIN-gate skip list,
  and each handler MUST reject requests without a valid key before doing
  anything else.

### Functional Requirements — Demo, health, and the wall

- **FR-019**: Demo mode MUST keep the prototype's browser-local store for
  the wall and the phone page. `GET /api/wall` in demo returns a fresh
  sample snapshot; `POST /api/wall` and all bot writes return 403.
- **FR-020**: `/api/health` MUST add `store: "ok" | "down" |
  "unconfigured" | "demo"` without exposing credentials.
- **FR-021**: The Today banner MUST read notes from the store in live mode,
  drop the "Sample data" flag for notes, and show "from <name>".
- **FR-022**: The Bots button on the rail MUST be removed in live mode. In
  demo mode it stays as a demonstration.
- **FR-023**: `.env.example` MUST document every new variable with empty
  values, and the bundle gate MUST scan for a configured test bot key and
  store token.

## Success Criteria

- **SC-001**: A bot note appears on the wall within 30 seconds and expires
  on time.
- **SC-002**: The scope, rate-limit, and demo tables pass as unit tests and
  as e2e auth-gate cases.
- **SC-003**: 20 concurrent ops all land (memory and file adapters in CI).
- **SC-004**: Client bundles contain no bot key or store token.
- **SC-005**: Killing the store leaves the wall drawn with the last data.

## Assumptions

- Upstash Redis has a free tier through the Vercel Marketplace that fits a
  family wall (to be confirmed under FR-013).
- Bots are Dan's own agents; per-key scopes and rate limits are enough, no
  per-bot user accounts.

## Out of Scope

- Shopping, To-dos, and Meals operations (Phases 12 and 13).
- Bots writing calendar events. They write to Google Calendar directly and
  the wall reads the feed.

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| FR-001 to FR-007 | IV (durable store, caps, atomic writes) |
| FR-010 to FR-013 | III (PIN, same-origin writes), IV (bounded polling) |
| FR-014 to FR-018 | III (per-bot keys, scopes, rate limit, data not markup) |
| FR-019 to FR-023 | III (demo refuses writes, no secrets in bundles), IV (stale over blank) |
