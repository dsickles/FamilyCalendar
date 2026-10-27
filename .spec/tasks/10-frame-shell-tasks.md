# Tasks: Frame-Ready Shell

**Input**: `.spec/specifications/10-frame-shell.md`
**Constitution**: `.spec/constitution.md` (v2.0.0)
**Project context**: `.spec/project.md`
**Status**: Not started. Starts only on "implement Phase 10", after constitution v2.0.0 is approved.

## Format

`- [ ] Tnnn [P?] [US?] Step 10.N — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US6]**: Maps to user stories in the specification
- Task IDs continue from Phase 9.1 (`T063`)

## Path Conventions

Repository root is the Next.js app (no `src/`). Read the relevant guide in
`node_modules/next/dist/docs/` before changing routing, redirects, the proxy,
or fonts. Do not commit `.env.local`, a PIN, an ICS URL, or a live URL.

---

## Phase 10: Frame-Ready Shell

**Goal**: `/` is the tabbed wall at 1920×1080, Today and Calendar use real
data, and CI enforces the v2.0.0 gates including WebView 124.

### Step 10.1 — Floor first

- [ ] T064 [P] [US4] Step 10.1 — Add the explicit `browserslist` to
      `package.json` (User Story 4, scenario 1). (`package.json`)
- [ ] T065 [US4] Step 10.1 — Write `scripts/check-browser-floor.mjs`:
      resolve browserslist and fail on any Chrome target above 124; scan
      `.next/static` for the post-124 list with a commented allowlist;
      measure gzip JS for `/` from the built HTML and fail above 250 KB.
      Add `npm run check:browser-floor`. Depends on T064.
      (`scripts/check-browser-floor.mjs`, `package.json`)
- [ ] T066 [US4] Step 10.1 — Add the `chromium-124` Playwright project
      reading `CHROME_124_PATH`; in `gates.yml`, install and cache Chrome
      for Testing 124.0.6367.x with `@puppeteer/browsers`, run the floor
      script after the build, and run the e2e suite on both projects. If
      Playwright can't drive 124, stop and report. (`playwright.config.ts`,
      `.github/workflows/gates.yml`)

### Step 10.2 — Move the wall to `/`

- [ ] T067 [US1] Step 10.2 — Move `app/wall/page.tsx` to `app/page.tsx`,
      `app/wall/list/page.tsx` to `app/list/page.tsx`, and the wall layout
      (fonts, `wall.css`) so it covers both. (`app/`)
- [ ] T068 [US1] Step 10.2 — Add 308 redirects `/wall` → `/` and
      `/wall/list` → `/list` in `next.config.ts`. Depends on T067.
- [ ] T069 [US6] Step 10.2 — Delete the iPad-era shell: old `app/page.tsx`
      content, `components/layout/DashboardShell.tsx`,
      `components/layout/RotateNotice.tsx`,
      `components/widgets/ClockWidget.tsx`,
      `components/widgets/WeatherWidget.tsx`, the `.kiosk-*` scale and
      rotate CSS, and iPad breakpoint tokens in `app/globals.css`.
      Depends on T067.
- [ ] T070 [P] [US6] Step 10.2 — Update `app/manifest.ts` (name, start URL,
      no orientation lock). (`app/manifest.ts`)
- [ ] T071 [P] [US6] Step 10.2 — Rename `middleware.ts` to `proxy.ts` with
      an exported `proxy` function; behavior unchanged; add `/list` to the
      auth gate tests. (`proxy.ts`, `e2e/auth.spec.ts`)

### Step 10.3 — Today on real data

- [ ] T072 [P] [US2] Step 10.3 — Add the hourly series to the weather
      engine, types, cache key, and tests (FR-006). (`lib/weather-engine.ts`,
      `lib/types/weather.ts`, `lib/weather-engine.test.ts`)
- [ ] T073 [P] [US2] Step 10.3 — Add `travelMinutes` from
      `CAL_<ID>_TRAVEL_MIN` and `calendarTravelMinutes` on `UnifiedEvent`
      (FR-008). (`lib/config.ts`, `lib/types/calendar.ts`,
      `lib/calendar-engine.ts`, `.env.example`, tests)
- [ ] T074 [US2] Step 10.3 — Write `lib/wall/today.ts` (Next up, lanes,
      Leave-in) and `lib/wall/weather-sentence.ts` with unit tests
      (FR-007, FR-009). Depends on T072, T073.
- [ ] T075 [US2] Step 10.3 — Wire Today's header, hourly strip, hero, and
      lanes to them; keep demo sample data; flag sample-only tiles
      (FR-010). (`components/wall/TodayTab.tsx`, `lib/wall/useWallEvents.ts`)
      Depends on T074.

### Step 10.4 — Calendar tab

- [ ] T076 [US3] Step 10.4 — `CalendarViewMachine`: `idleReset={false}`,
      `onToday`, Month label and 4-week paging with Today control within
      the window (FR-011, FR-012). (`components/calendar/*`)
- [ ] T077 [US3] Step 10.4 — Remove the calendar's header and dark theme
      remnants; mark the week grid `data-scroll-region="week-grid"`
      (FR-013, FR-017). Depends on T076.

### Step 10.5 — Gates

- [ ] T078 [US5] Step 10.5 — Replace `VIEWPORTS` with `WALL_VIEWPORT` and
      `PHONE_VIEWPORT`; rewrite `e2e/layout.spec.ts` and `e2e/wall.spec.ts`
      for every tab at 1920×1080 and `/list` at 390×844; add the
      scroll-region check from one exported list. (`e2e/*`)
- [ ] T079 [US5] Step 10.5 — Uptime e2e: idle to Today with
      `IDLE_TIMEOUT_MS=2000` (Photos exempt) and the 30-cycle leak check
      behind `NEXT_PUBLIC_GATE_HOOKS=1` (FR-018). (`e2e/uptime.spec.ts`,
      `lib/wall/gate-hooks.ts`, `playwright.config.ts`)
- [ ] T080 [P] [US6] Step 10.5 — README: tabbed wall at `/`, the frame, the
      phone page; remove iPad and Guided Access steps (FR-019).
      (`README.md`)

### Phase 10 Verification

| Check | Evidence |
|-------|----------|
| Viewport gate | Every tab at 1920×1080 and `/list` at 390×844 pass on current Chromium and Chromium 124 |
| Frame browser gate | `npm run check:browser-floor` passes; JS for `/` ≤ 250 KB gzip (record the number) |
| Bundle and secret gates | `npm run check:secrets` passes; `git status` clean of `.env.local` |
| Auth gate | `/`, `/list`, `/api/calendar`, `/api/weather` gated; `/unlock`, `/api/health` open |
| Uptime gate | Idle to Today; leak check within 10% |
| Device gate | Pending until Phase 15 (or run early if the frame is set up) |

**Stop after this gate.** Summarize, list paths to review, and wait for
"implement Phase 11" (or 14 or 15) in a new chat.
