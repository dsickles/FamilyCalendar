# Specification: Real Feeds, Device Test, and README

**Feature ID**: `09-real-feeds`
**Created**: 2026-09-25
**Status**: Review complete 2026-09-25. Implemented 2026-09-25 (T056–T058). Do not start a Phase 10.
**Input**: `.spec/project.md` Phase 9 ("Real feeds, device test, README"). `.spec/project.md` still lists Phases 3–9 as deferred. Phases 1, 1.5, 2, 3, 4, 5, 6, 7, and 8 are implemented (through T055). Trust `.spec/specifications/01-core-and-security.md` through `.spec/specifications/08-idle-reset.md` and `.spec/tasks/01-core-tasks.md` through `.spec/tasks/08-idle-tasks.md`. Where those specs disagree with the tree, trust the code.
**Constitution check**: Principle I (1180×820 fills that viewport; 1366×1024 and 1920×1080 fill those viewports; below 1180 on either edge the 1180×820 layout scales down; zero document scroll; contained vertical scroll only inside the week time grid with `overscroll-behavior: contain`; 44×44pt targets), Principle II (live `CAL_*_URL` values stay in env only; demo mode when none are set; no PIN, ICS URL, or live family event in git, docs, or client bundles), Principle III (existing feed timeouts, cache, health probe, and idle view-reset stay as they are)
**Project context**: `.spec/project.md`
**Depends on**: the implemented shell through Phase 8. Do not reopen the PIN-gate, calendar engine, weather engine, clock, layout, month, week, day, filters, idle reset, swipe, or `LockControl` unless a Phase 9 check shows one of them is broken.

This specification does three things. A fresh clone with no `CAL_*_URL` stays in demo mode and never needs a PIN. An operator points NAS or Vercel at real ICS feeds by setting environment variables, not by committing URLs. The README says both of those things in current terms. A device check confirms the shipped wall still fills 1180×820, 1366×1024, and 1920×1080.

The fetch, parse, PIN-gate, and views already exist. This phase does not rebuild them.

## Demo mode and real feeds

`isDemoMode()` is already true when every `CAL_*_URL` is empty. Middleware already skips the PIN-gate in that case. `GET /api/calendar` already returns `generateDemoEvents()` and does not fetch ICS. `GET /api/health` already reports `mode: "demo"` or `mode: "live"`.

| Environment | What the wall does | What it must not do |
|-------------|--------------------|---------------------|
| No `CAL_*_URL` set (fresh clone, no `.env.local`, or every calendar URL empty) | Demo mode. `/` renders sample calendars (Alex, Jordan, Family, School). No PIN pad. `LockControl` stays omitted. Health reports `mode: "demo"`. | No outbound ICS fetch. No PIN required. No live family titles. |
| One or more `CAL_*_URL` values set, including `fixture:mock.ics` | Live mode. PIN-gate stays on. The server reads those URLs and returns unified events. Health reports `mode: "live"`. | The URL, the PIN, and `icsUrl` never appear in the client payload, the client bundle, or git. |
| Development only, `/?demo=1`, even if `.env.local` has feeds | The calendar region shows `generateDemoEvents()` instead of the live fetch. | Production ignores `demo=1`. That flag is not a way to publish family data, and it is not a way to turn off the PIN-gate on a live deployment. |

Live calendar URLs stay in environment variables only:

- Local and NAS: `.env.local`, gitignored, passed by Compose `env_file`. Not copied into the image (`.dockerignore` already excludes `.env.local` and `.env.*.local`).
- Vercel: the same names as platform environment variables. No URL is written into a committed config file.

`.env.example` stays the committed template. URL and PIN values stay empty. Labels, colors, categories, and the non-secret defaults (Scarsdale coordinates, `America/New_York`, 12-hour time, Fahrenheit, Sunday week start, `IDLE_TIMEOUT_MS=90000`, `CACHE_REVALIDATE_SECONDS=600`) may stay. The README names the variables. It does not paste a real ICS URL, a real PIN, or a household event.

Any additional `CAL_<ID>_URL` the operator adds follows the existing `getCalendarSources()` rule: `<ID>` is an alphanumeric slug, with optional `CAL_<ID>_LABEL`, `CAL_<ID>_COLOR`, and `CAL_<ID>_CATEGORY` (`person`, `shared`, `utility`, or `external`). An empty URL stays disabled. This phase does not change that parser.

## README

`README.md` is stale. It still says the calendar engine, weather, and month/week/day UI are ahead. This phase rewrites it so a stranger can run the public demo, and so an operator can attach real feeds on either deploy path, without learning that from `.spec/`.

The README covers:

1. What the appliance is: wall kiosk, demo on a public clone, live ICS behind the same PIN-gate on NAS or Vercel, idle returns to the month view and does not lock.
2. Demo quick start: `npm install`, `npm run dev`, open `http://localhost:3000` with no `CAL_*_URL`. No PIN. Sample calendars. `GET /api/health` reports demo mode. `npm run build` and `npm start` are the production-mode local check of that same demo.
3. What the running demo shows: header row (clock, current weather, 3-day forecast), filter chips, 4-week month grid, week view, day view. Primary check size is iPad Air 2020 landscape at 1180×820. The stage also fills 1366×1024 and 1920×1080. Below 1180 on either edge the 1180×820 layout scales down. The document does not scroll. The week time grid is the only vertical scroller.
4. Operator setup: copy `.env.example` to `.env.local`. Set `DASHBOARD_PIN` (4–8 digits) and at least one `CAL_<ID>_URL`. Leave those values out of git. With any calendar URL set, `/` redirects to `/unlock` until the PIN succeeds. After unlock the wall stays view-only until explicit lock or the 30-day cookie ends. Idle does not return the PIN pad.
5. Path A — Docker on NAS (primary): `docker compose` from this repo, port `3000:3000`, `env_file: .env.local`, `restart: unless-stopped`, healthcheck on `/api/health`. The iPad on the same LAN opens `http://<NAS-IP>:3000`. No public port forward. Secrets are not baked into the image.
6. Path B — Vercel (optional): set `CAL_*` and `DASHBOARD_PIN` in the Vercel project environment. The application PIN-gate stays mandatory. Vercel Deployment Protection may sit in front of it and does not replace it. The README does not link a live private dashboard URL.
7. Development preview: when `.env.local` already has feeds, `/?demo=1` during `npm run dev` shows sample events in the calendar region. Production does not honor that flag.
8. A short pointer at `.spec/constitution.md` and `.spec/project.md`. No live family data, no filled ICS URL, no PIN digit sequence.

The README does not document internal module layouts beyond what an operator needs to boot the app.

## Device test

The layout code stays as Phase 4 through Phase 8 left it. This phase checks it on demo mode and records the result in the task gate. A failure is a bug in the existing shell, fixed only as far as that check requires. A pass does not authorize a visual redesign.

| Viewport | Expected |
|----------|----------|
| 1180×820 | Primary iPad Air 2020 landscape. The stage fills that viewport. |
| 1366×1024 | The stage fills that viewport. |
| 1920×1080 | The stage fills that viewport. |
| Smaller than 1180 on either edge | The 1180×820 layout scales down. No document scrollbar. |

On each size: `document` scroll position stays 0, `scrollHeight` does not exceed the layout viewport, background stays `#0a0a0f`. Contained vertical scroll exists only inside the week time grid (`overflow-y: auto`, `overscroll-behavior: contain`). Month and day do not scroll the document. Header tap targets that are already 44×44 stay that size. The filter row stays 28px.

Run this on `http://localhost:3000` with no `CAL_*_URL` (demo mode), on month, week, and day. Do not point the check at a live family feed.

## Surfaces this phase must leave in place

These are already in the tree. This phase does not rebuild them and does not revert them.

- PIN-gate, unlock page, `dash_session`, rate limit, and `LockControl` (omitted in demo mode).
- Calendar engine, `fixture:mock.ics`, cache, `GET /api/calendar`, and the rule that client JSON has `calendarId`, `calendarLabel`, `calendarColor`, and `calendarCategory` only.
- Weather engine, clock, header row, month grid, week view, day view, filter chips, idle return to the today-anchored month, and horizontal swipe.
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitignore`, and `.env.example` structure. Empty URL and PIN placeholders stay empty.
- `html` and `body` kiosk resets and `.kiosk-stage` scaling.

## User Scenarios & Testing

### User Story 1 — A fresh clone runs the demo with no secrets (Priority: P1)

Someone clones the public repo, installs, and starts the dev server without creating `.env.local`. The wall opens on sample calendars. There is no PIN pad. The README they followed matches what they see. Nothing in the clone is a real family feed.

**Why this priority**: Constitution II. The public repo is the portfolio surface. If the README still says the UI is unfinished, or if demo mode demands a PIN, the clone is not portfolio-safe.

**Independent Test**: From a tree with no `CAL_*_URL` and no `DASHBOARD_PIN`, run `npm run dev` and open `/`. The month grid shows Alex, Jordan, Family, and School. There is no "Lock dashboard" control. `GET /api/health` is `{ status: "ok", mode: "demo" }`. Searching the README, `.env.example`, and the calendar JSON for a filled ICS URL or a PIN finds none.

**Acceptance Scenarios**:

1. **Given** no `CAL_*_URL` values, **When** a visitor opens `/`, **Then** the app does not redirect to `/unlock` and the calendar shows demo events from `generateDemoEvents()`.
2. **Given** that same process, **When** `GET /api/health` is called, **Then** the body has `status: "ok"` and `mode: "demo"`.
3. **Given** the rewritten README, **When** a new clone follows only the demo section, **Then** the commands are `npm install` and `npm run dev`, the URL is `http://localhost:3000`, and the text does not ask for a PIN or a calendar URL.
4. **Given** the git tree and the README, **When** they are searched, **Then** there is no real ICS URL, no PIN, and no live family event title. `.env.example` URL and PIN fields are empty.

---

### User Story 2 — An operator attaches real feeds without putting them in git (Priority: P1)

The household already has ICS subscriptions. The operator copies `.env.example` to `.env.local` (or sets the same names on Vercel), fills `DASHBOARD_PIN` and at least one `CAL_<ID>_URL`, and runs the existing NAS Compose stack or the Vercel project. The wall requires the PIN once. Feed URLs stay on the server.

**Why this priority**: Phase 2 already fetches those URLs. Phase 9 is the operator-facing contract so a real deployment does not invent a second config channel or commit the feeds.

**Independent Test**: The README's NAS section matches `docker-compose.yml` (port 3000, `env_file: .env.local`, `restart: unless-stopped`, healthcheck on `/api/health`). The Vercel section names platform environment variables and says Deployment Protection does not replace the PIN-gate. Neither section contains a real URL. `.env.local` is gitignored and dockerignored. Client calendar JSON still has no `icsUrl` key.

**Acceptance Scenarios**:

1. **Given** the README operator section, **When** it is compared with Compose and the constitution, **Then** it tells the operator to set `DASHBOARD_PIN` and `CAL_<ID>_URL` in `.env.local` for NAS and as Vercel environment variables for Path B, and it does not add a committed file of URLs.
2. **Given** any `CAL_*_URL` is set, **When** an unauthenticated browser requests `/`, **Then** the existing middleware still redirects to `/unlock`. This phase does not edit that rule.
3. **Given** a live response from `GET /api/calendar`, **When** the JSON is inspected, **Then** events may include calendar id, label, color, and category, and they do not include `icsUrl` or the feed URL string.
4. **Given** `npm run dev` with feeds present in `.env.local`, **When** the operator opens `/?demo=1`, **Then** the calendar region shows demo events. A production build does not treat `demo=1` as demo mode.
5. **Given** `.gitignore` and `.dockerignore`, **When** they are read, **Then** `.env.local` and `.env.*.local` are ignored. This phase does not commit `.env.local` or `cal-html.txt`.

---

### User Story 3 — The shipped wall still passes the device sizes (Priority: P1)

The kiosk is accepted on the iPad Air 2020 landscape size and on the two larger targets already in the constitution. This phase re-checks demo mode at those sizes after the README work. It does not restyle the dashboard.

**Why this priority**: Principle I is a merge gate. A docs-only phase can still ship a README that describes a viewport the page no longer fills.

**Independent Test**: Demo mode in the browser at 1180×820, then 1366×1024, then 1920×1080, on month, week, and day. Then a window below 1180 on one edge. Document scroll stays impossible. Only the week time grid scrolls vertically.

**Acceptance Scenarios**:

1. **Given** demo mode at 1180×820, **When** month, week, and day are opened, **Then** the stage fills the viewport, the document does not scroll, and the background is `#0a0a0f`.
2. **Given** 1366×1024 and 1920×1080, **When** the same three views are shown, **Then** the stage fills each viewport and the document still does not scroll.
3. **Given** a viewport below 1180 on width or height, **When** the page is shown, **Then** the 1180×820 layout scales down and the document still does not scroll.
4. **Given** week view, **When** the time grid is scrolled, **Then** that grid is the only scroller (`overscroll-behavior: contain`). Month view and day view do not scroll the document.

---

### Edge Cases

- **PIN set, no calendar URL**: Demo mode stays on. Auth stays skipped. A PIN alone does not turn on live mode. The README says live mode starts when a `CAL_*_URL` is set, and that a live deployment also sets `DASHBOARD_PIN`.
- **Calendar URL set, PIN empty**: Existing fail-closed behavior stays. Unlock cannot succeed until `DASHBOARD_PIN` is set. This phase does not change middleware.
- **`fixture:mock.ics`**: Still counts as live mode and still requires the PIN. The README may name that fixture as a local parser check. It is not the public demo path.
- **`/?demo=1` in production**: Ignored. Live deployments keep the PIN-gate and the live fetch.
- **Example comment in `.env.example`**: The committed template may keep a non-secret shape hint. It must not gain a real host path, token, or household calendar. The README does not copy a filled URL.
- **Scratch file**: `cal-html.txt` is an untracked local dump. Do not commit it. Do not quote its contents into the README.
- **Stale project table**: `.spec/project.md` still marks Phases 3–9 deferred. This phase does not rewrite that table.
- **Broken shell during the device check**: Fix only the overflow or scale regression that fails the gate. Do not restyle month, week, day, filters, idle, or swipe.

## Requirements

### Functional Requirements — Portfolio demo

- **FR-001**: With no `CAL_*_URL` values, `/` stays reachable without `/unlock`, the calendar shows demo events, `LockControl` stays omitted, and `GET /api/health` reports `mode: "demo"`. This phase does not change `isDemoMode()`, middleware, or `generateDemoEvents()` unless that check fails.
- **FR-002**: `README.md` replaces the "not shipped yet" status with the shipped wall: demo quick start, the three views, the header, filters, and the viewport rules in this specification. Demo instructions do not require `.env.local`, a PIN, or a calendar URL.

### Functional Requirements — Real feeds

- **FR-003**: The README tells an operator to put `DASHBOARD_PIN` and `CAL_<ID>_URL` in `.env.local` for Docker on NAS, and in Vercel environment variables for Path B. It states that NAS uses the existing Compose file (port 3000, `env_file: .env.local`, `restart: unless-stopped`, `/api/health` healthcheck), that the iPad stays on the LAN, and that Vercel Deployment Protection does not replace the PIN-gate. It does not link a live dashboard URL.
- **FR-004**: No task in this phase writes a real ICS URL, PIN, or live family event into source, `README.md`, `.env.example`, or any other tracked file. `.env.example` URL and PIN values stay empty. `.env.local` stays gitignored and dockerignored.
- **FR-005**: Client calendar payloads stay free of `icsUrl` and feed URL strings. Client modules still do not import `lib/config.ts`. `/?demo=1` remains a development-only preview and is described that way in the README.

### Functional Requirements — Device test

- **FR-006**: Verification runs demo mode at 1180×820, 1366×1024, and 1920×1080 on month, week, and day, plus one window below 1180 on either edge. Pass means the stage fills the three named viewports, the smaller window scales the 1180×820 layout down, document scroll stays at zero, and the only contained vertical scroll is the week time grid.
- **FR-007**: Files outside `README.md` change only when FR-006 fails or when FR-001 fails. Those fixes stay inside the failing gate. They do not reopen the engines, the PIN-gate, or the view behavior listed under "Surfaces this phase must leave in place".

### Key Entities / Data Contracts

No new type. Live vs demo stays the existing `DashboardConfig.isDemoMode` flag: true when no calendar source is enabled. The client still receives calendar `id`, `label`, `color`, and `category` only.

```text
Fresh clone (no CAL_*_URL)
  README demo section → npm run dev → /  (no PIN)
  health.mode = "demo"
  events = generateDemoEvents()

Operator
  .env.local or Vercel env: DASHBOARD_PIN + CAL_<ID>_URL
  NAS: docker compose, LAN :3000
  Vercel: same names, PIN-gate still on
  health.mode = "live"
  GET /api/calendar JSON has no icsUrl
```

## Success Criteria

- **SC-001**: A clone with no calendar URLs follows the README, opens the demo wall, and never sees a PIN pad. Health reports demo mode.
- **SC-002**: The README is sufficient for an operator to point NAS or Vercel at real feeds using environment variables only. The git tree after this phase still has no PIN, no ICS URL, and no live family data.
- **SC-003**: Demo mode at 1180×820, 1366×1024, and 1920×1080 fills each viewport with no document scroll. Below 1180 on either edge the existing scale still applies. Week view alone scrolls inside the time grid.
- **SC-004**: The PIN-gate, calendar engine, weather engine, clock, layout, month, week, day, filters, idle reset, swipe, and `LockControl` are unchanged unless a gate in this specification failed and the fix was limited to that failure.

## Assumptions

- Phases 1 through 8 already implement demo mode, ICS fetch, the PIN-gate, both deploy files, and the kiosk layout. Phase 9 documents and checks that contract.
- Default public demo needs no `.env.local`. An operator who already has `.env.local` uses `/?demo=1` only in development to see sample events.
- NAS means the existing `Dockerfile` and `docker-compose.yml`. This phase does not add a registry publish step or a port-forward guide.
- Vercel means the operator sets environment variables in the project dashboard. This phase does not add `vercel.json` secrets or a live URL.
- Device verification uses the local demo server and browser tooling. A physical iPad is not required for the gate. The CSS pixel targets are the acceptance sizes.
- `.spec/project.md` stays stale on the phase table. Later review can stamp it. This spec does not.

## Out of Scope (this specification)

- A Phase 10, or any new view, widget, or feed provider
- Rewriting `.spec/project.md`, the constitution, or specs 01 through 08
- Changing `middleware.ts`, auth routes, `lib/config.ts`, `lib/calendar-engine.ts`, `lib/demo-data.ts`, weather, clock, layout, month, week, day, filters, idle, swipe, or `LockControl` when they already match this spec
- Committing `.env.local`, `cal-html.txt`, or any captured live calendar payload
- Embedding a real ICS URL or PIN in the README or `.env.example`
- Public port forwarding, a custom domain write-up, or a link to the private kiosk
- New npm dependencies

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | The device gate re-checks 1180×820, 1366×1024, and 1920×1080, the scale below 1180, zero document scroll, and week-grid-only vertical scroll |
| II Privacy | Demo mode stays the public path; live URLs and the PIN stay in env; the README and git tree stay free of feeds and family data; client JSON still has no `icsUrl` |
| III Appliance | Existing health, cache, feed timeout, and idle view-reset stay in place; the README describes idle as a return to month view, not a lock |
