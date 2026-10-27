# Tasks: Saved Data and Bot Access

**Input**: `.spec/specifications/11-saved-data-and-bots.md`
**Constitution**: `.spec/constitution.md` (v2.0.0)
**Project context**: `.spec/project.md`
**Status**: Not started. Starts only on "implement Phase 11", after Phase 10 is merged.

## Format

`- [ ] Tnnn [P?] [US?] Step 11.N — description (files)`

Task IDs continue from Phase 10 (`T080`).

---

## Phase 11: Saved Data and Bot Access

**Goal**: One server store behind a PIN-gated wall API and a keyed bot
API (HTTPS and MCP), proven end to end with bot notes on Today.

### Step 11.1 — Store

- [ ] T081 [US4] Step 11.1 — Move the binding types to `lib/wall/types.ts`
      (FR-007) and define `WallStore`, `WallOp`, `Actor` in
      `lib/store/types.ts`.
- [ ] T082 [US4] Step 11.1 — Op table `lib/store/ops.ts`: name, Zod
      schema, scope, activity text; `note.post`, `note.dismiss`,
      `today.read` (FR-008, FR-009). Add `zod`. Depends on T081.
- [ ] T083 [US4] Step 11.1 — Shared `apply` logic: validate, apply, caps,
      pruning, activity, version bump (FR-004 to FR-006), with unit tests
      for every cap. (`lib/store/apply.ts`) Depends on T082.
- [ ] T084 [P] [US4] Step 11.1 — Memory and file adapters with the
      20-concurrent-ops test. (`lib/store/memory.ts`, `lib/store/file.ts`)
- [ ] T085 [P] [US4] Step 11.1 — Upstash adapter with the Lua
      compare-and-set and 3 retries; opt-in integration test behind
      `UPSTASH_TEST=1`. Add `@upstash/redis`. (`lib/store/upstash.ts`)
- [ ] T086 [US2] Step 11.1 — `getStore()` picks the adapter from env;
      `/api/health` gains `store` (FR-020). Depends on T084, T085.

### Step 11.2 — Wall API

- [ ] T087 [US1] Step 11.2 — `GET /api/wall` with version ETag and 304;
      `POST /api/wall` with JSON-only, same-origin check, `by` actor
      (FR-010, FR-011); demo returns a sample snapshot and 403 on writes
      (FR-019). (`app/api/wall/route.ts`)
- [ ] T088 [US1] Step 11.2 — Confirm the Upstash free-tier command limit,
      record it in the spec under FR-013, and set the poll interval.

### Step 11.3 — Bot API

- [ ] T089 [US3] Step 11.3 — Bot key config and constant-time digest check;
      duplicate-key startup error (FR-014). (`lib/bots.ts`, tests)
- [ ] T090 [US3] Step 11.3 — `POST /api/bot/[op]` and `GET /api/bot/today`
      generated from the op table, with the status codes in FR-015 and the
      store-backed rate limit (FR-017). (`app/api/bot/[op]/route.ts`,
      `app/api/bot/today/route.ts`) Depends on T089.
- [ ] T091 [US3] Step 11.3 — `/api/mcp` Streamable HTTP, stateless, tools
      from the op table filtered by scope (FR-016). Add
      `@modelcontextprotocol/sdk`. (`app/api/mcp/route.ts`) Depends on T089.
- [ ] T092 [US3] Step 11.3 — Add `/api/bot/` and `/api/mcp` to the proxy
      skip list (FR-018). (`proxy.ts`)

### Step 11.4 — Wall

- [ ] T093 [US1] Step 11.4 — `useWallSnapshot()` SWR hook (15-second
      visible polling, no overlap, last-known on error, stale mark on the
      rail); keep the browser store for demo. (`lib/wall/store.ts`,
      `lib/wall/useWallSnapshot.ts`)
- [ ] T094 [US1] Step 11.4 — Today banner from the store with dismiss;
      remove the Bots button in live mode (FR-021, FR-022).
      (`components/wall/TodayTab.tsx`, `components/wall/Rail.tsx`)
- [ ] T095 [P] Step 11.4 — `.env.example` and the bundle gate's fake bot
      key and store token (FR-023). (`.env.example`,
      `scripts/check-secrets.mjs`, `.github/workflows/gates.yml`)

### Step 11.5 — Gates

- [ ] T096 [US3] Step 11.5 — e2e: bot auth table (401, 403, 429, demo 403),
      a note appearing on the wall, and store-down stale behavior.
      (`e2e/bots.spec.ts`)

### Phase 11 Verification

| Check | Evidence |
|-------|----------|
| Auth gate | Wall API gated by PIN; bot routes 401/403/429 as specified; demo refuses writes |
| Uptime gate | Caps and pruning unit tests; store-down wall stays drawn |
| Bundle gate | No bot key or store token in client bundles |
| Viewport and floor gates | Unchanged from Phase 10, still passing on both Chromium projects |
| Device gate | Run `scripts/device-check.sh` if Phase 15 is done; otherwise pending |

**Stop after this gate.**
