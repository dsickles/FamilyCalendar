# Tasks: Meals

**Input**: `.spec/specifications/13-meals.md`
**Constitution**: `.spec/constitution.md` (v2.0.0)
**Project context**: `.spec/project.md`
**Status**: Not started. Starts only on "implement Phase 13", after Phase 11 is merged.

## Format

`- [ ] Tnnn [P?] [US?] Step 13.N — description (files)`

Task IDs continue from Phase 12 (`T104`). If Phase 13 runs before Phase 12,
keep these IDs and leave T097–T104 for Phase 12.

---

## Phase 13: Meals

**Goal**: Bots write the meal plan; the Meals tab is a cooking card
readable from across the counter.

- [ ] T105 [US1] Step 13.1 — Meal ops, 16 KB and date-range limits,
      14-day pruning (FR-001 to FR-003), with unit tests.
      (`lib/store/ops.ts`, `lib/store/apply.ts`)
- [ ] T106 [US2] Step 13.2 — Meals tab on the store: dinner card (heat,
      timeline with past and next steps, prep, steps in the `meal-steps`
      region, ingredients), breakfast and lunch rows, next-5-dinners strip
      (FR-004, FR-005). (`components/wall/MealsTab.tsx`)
- [ ] T107 [US2] Step 13.2 — "Add N missing to list" via `shopping.add`;
      hidden until Phase 12 ops exist. Today dinner tile on the store.
      (`components/wall/MealsTab.tsx`, `components/wall/TodayTab.tsx`)
- [ ] T108 [P] [US3] Step 13.3 — Phone page Meals tab: next 7 days,
      rename, clear, tick ingredients on hand.
      (`components/wall/PhonePage.tsx`)
- [ ] T109 [US1] Step 13.4 — e2e: a bot-written week; the largest allowed
      meal fits 1920×1080; `meals` scope cases. (`e2e/meals.spec.ts`)

### Phase 13 Verification

| Check | Evidence |
|-------|----------|
| Viewport gate | Largest meal fits; only `meal-steps` scrolls |
| Auth gate | `meals` scope enforced; demo refuses writes |
| Uptime gate | 14-day pruning test |
| Floor gate | Both Chromium projects pass; JS budget recorded |
| Device gate | `scripts/device-check.sh` output, or pending |

**Stop after this gate.**
