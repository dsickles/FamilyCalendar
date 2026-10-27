# Tasks: Shopping, To-dos, and the Phone Page

**Input**: `.spec/specifications/12-shopping-todos-phone.md`
**Constitution**: `.spec/constitution.md` (v2.0.0)
**Project context**: `.spec/project.md`
**Status**: Not started. Starts only on "implement Phase 12", after Phase 11 is merged.

## Format

`- [ ] Tnnn [P?] [US?] Step 12.N — description (files)`

Task IDs continue from Phase 11 (`T096`).

---

## Phase 12: Shopping, To-dos, and the Phone Page

**Goal**: One saved list and one saved to-do list, shared by the wall, the
phone page, and bots.

### Step 12.1 — Operations

- [ ] T097 [P] [US1] Step 12.1 — Shopping ops, name normalization and
      merge, favourites counter (FR-001, FR-003, FR-005), with unit tests.
      (`lib/store/ops.ts`, `lib/store/apply.ts`)
- [ ] T098 [P] [US1] Step 12.1 — `lib/wall/aisles.ts` keyword map with
      tests (FR-004).
- [ ] T099 [P] [US3] Step 12.1 — To-do ops with append-only notes and
      partial update (FR-002, FR-006), with the concurrent-append test.

### Step 12.2 — Wall

- [ ] T100 [US2] Step 12.2 — Shopping tab and Today tile on the store with
      optimistic updates, favourites row, Clear ticked, and the
      `shopping-list` scroll region (FR-007, FR-008).
      (`components/wall/ShoppingTab.tsx`, `components/wall/TodayTab.tsx`)
- [ ] T101 [US3] Step 12.2 — To-dos tab and Today tile on the store,
      grouped by owner, read-only details, `todo-list` scroll region.
      (`components/wall/TodosTab.tsx`)

### Step 12.3 — Phone page

- [ ] T102 [US1] Step 12.3 — `/list` on the store: name prompt, List and
      To-dos tabs, Recent, retry-on-failure input, focus refetch, polling
      (FR-009, FR-011). (`components/wall/PhonePage.tsx`, `app/list/`)
- [ ] T103 [P] [US1] Step 12.3 — Home-screen icon and manifest for `/list`
      (FR-010).

### Step 12.4 — Gates

- [ ] T104 [US1] Step 12.4 — e2e: phone add shows on the wall; 200-item
      Shopping fits 1920×1080 with only its region scrolling; `/list` at
      390×844; bot `shopping.*` and `todo.*` scope cases.
      (`e2e/lists.spec.ts`, `e2e/bots.spec.ts`)

### Phase 12 Verification

| Check | Evidence |
|-------|----------|
| Viewport gate | Shopping and To-dos full at 1920×1080; `/list` at 390×844 |
| Auth gate | `/list` PIN-gated; bot scopes enforced |
| Uptime gate | 200-item and 300-to-do caps; 24-hour and 30-day pruning |
| Floor gate | Both Chromium projects pass; JS budget recorded |
| Device gate | `scripts/device-check.sh` output, or pending |

**Stop after this gate.**
