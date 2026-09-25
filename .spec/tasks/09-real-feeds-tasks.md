# Tasks: Real Feeds, Device Test, and README

**Input**: `.spec/specifications/09-real-feeds.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: `.spec/project.md` Phase 9 (real feeds, device test, README). Phases 1, 1.5, 2, 3, 4, 5, 6, 7, and 8 are already implemented (through T055). Ignore the stale "Phase 3 deferred" through "Phase 9 deferred" rows in `.spec/project.md`.
**Status**: Review complete 2026-09-25. Implemented 2026-09-25 (T056–T058). Do not start a Phase 10.

**Tests**: Not requested as a separate TDD suite. The phase has a
**Verification** gate. That gate MUST pass before this phase is called done.

**Organization**: One implementation slice (Phase 9). The PIN-gate, calendar
engine, weather engine, clock, layout, month, week, day, filters, idle
reset, swipe, and `LockControl` already exist — do not revisit them unless
a check below shows they are broken.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US3]**: Maps to user stories in the specification
- Step IDs (`9.1` … `9.3`) are this phase's plan steps
- Task IDs continue from Phase 8 (`T055`)

## Path Conventions

Repository root is the Next.js app (no `src/` directory). The only file
this phase plans to edit is `README.md`. Touch another file only when the
verification gate fails, and only enough to make that check pass.

Live calendar URLs stay in env (`.env.local` locally and on NAS;
Vercel environment variables on Path B). Do not commit `.env.local`,
`cal-html.txt`, a PIN, an ICS URL, or live family events.

The kiosk shell stays as it is in the tree:

- Header row: clock, then current weather and the 3-day forecast, then
  `LockControl` at the far right (omitted in demo mode).
- 1180×820 fills that viewport and is the primary check. 1366×1024 and
  1920×1080 fill those viewports too. A window smaller than 1180×820 on
  either edge scales the 1180×820 layout down. Zero document scroll.
  Contained vertical scroll stays only inside the week time grid.
- Demo calendars when no `CAL_*_URL` is set: Alex, Jordan, Family, School.

**Do not start a Phase 10 in the same chat as this implementation.**

---

## Phase 9: Real Feeds, Device Test, and README

**Purpose**: The public README matches the shipped wall. A fresh clone
runs demo mode with no secrets. An operator can point NAS or Vercel at
real ICS feeds using environment variables only. The device sizes still
pass.

**Goal**: `README.md` is the only planned product edit. Demo mode, the
PIN-gate, and the feed engine stay as the code already has them.

- [x] T056 [US1] [US2] Step 9.1 — Rewrite `README.md` so it matches the
      shipped app. Remove the claim that the calendar engine, weather,
      and month/week/day UI are still ahead. Demo section: `npm install`,
      `npm run dev`, open `http://localhost:3000` with no `.env.local`
      and no `CAL_*_URL`; no PIN; sample calendars; `GET /api/health`
      reports `mode: "demo"`; mention `npm run build` and `npm start` as
      the production-mode local check of that same demo. Describe the
      header row, filter chips, 4-week month, week, and day. State the
      viewport rules: 1180×820 primary, stage fills 1366×1024 and
      1920×1080, scale down below 1180 on either edge, zero document
      scroll, contained vertical scroll only inside the week time grid.
      Operator section: copy `.env.example` to `.env.local`; set a 4–8
      digit `DASHBOARD_PIN` and at least one `CAL_<ID>_URL` (optional
      `CAL_<ID>_LABEL`, `CAL_<ID>_COLOR`, `CAL_<ID>_CATEGORY`); those
      values stay out of git. Path A: existing `docker-compose.yml` on
      NAS, port `3000:3000`, `env_file: .env.local`, `restart:
      unless-stopped`, healthcheck on `/api/health`, iPad on the same
      LAN, no public port forward, secrets not baked into the image.
      Path B: same variable names as Vercel environment variables;
      application PIN-gate stays mandatory; Vercel Deployment Protection
      does not replace it; do not link a live private dashboard. Say
      that any `CAL_*_URL` (including `fixture:mock.ics`) is live mode
      and requires the PIN, that a PIN with no calendar URL stays demo
      mode, that idle returns to the month view and does not lock, and
      that `/?demo=1` shows sample events only during `npm run dev`.
      Point at `.spec/constitution.md` and `.spec/project.md`. Do not
      paste a real ICS URL, a PIN, or a household event. Do not edit
      `.env.example` unless a placeholder URL or PIN value is non-empty.
      File: `README.md`.
- [x] T057 [P] [US2] Step 9.2 — Portfolio-safe tree check. No product
      edit unless this check fails. Confirm `.gitignore` and
      `.dockerignore` ignore `.env.local` and `.env.*.local`. Confirm
      `.env.example` leaves `DASHBOARD_PIN` and every `CAL_*_URL` empty.
      Confirm `git status` does not stage `.env.local` or `cal-html.txt`.
      Search tracked text for a filled ICS URL, a PIN digit sequence
      meant as the dashboard PIN, and `icsUrl` assigned a real URL.
      Client modules (`components/`, `app/page.tsx` is a Server
      Component and may call `getDashboardConfig`) must not import feed
      URLs into a client bundle: `icsUrl` stays off `UnifiedEvent` and
      off the calendar JSON shape. Do not print secret values into the
      chat or the README. Files to read, not to rewrite unless a leak
      is found: `.gitignore`, `.dockerignore`, `.env.example`,
      `lib/types/calendar.ts`.
- [x] T058 [US1] [US3] Step 9.3 — Verification only (no new product
      files). Run the app with no `CAL_*_URL` and check demo mode in
      the browser per the gate below, at 1180×820 on month, week, and
      day. Also confirm 1366×1024 and 1920×1080 fill the viewport, and
      that a window below 1180 on either edge scales the layout down.
      Do not point this check at a live family feed. Do not start a
      Phase 10.

### Phase 9 Verification

Demo mode matches the README. The operator section matches Compose and
the constitution without embedding secrets. The three viewports still
fill, and the document still does not scroll.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Demo boot | No `CAL_*_URL` and no `DASHBOARD_PIN`: `/` is 200, no redirect to `/unlock`, no "Lock dashboard" control. `GET /api/health` is `status: "ok"`, `mode: "demo"`. The calendar shows sample events (Alex, Jordan, Family, School) |
| README demo | A fresh clone can follow `README.md` alone: `npm install`, `npm run dev`, `http://localhost:3000`. The "not shipped yet" paragraph is gone. No PIN or calendar URL is required for that path |
| README operator | NAS steps match `docker-compose.yml` (port 3000, `env_file: .env.local`, `restart: unless-stopped`, `/api/health`). Vercel steps use platform env vars for `CAL_*` and `DASHBOARD_PIN` and say Deployment Protection does not replace the PIN-gate. No live dashboard URL. `/?demo=1` is described as development-only |
| Secrets | `.env.example` URL and PIN values are empty. `.env.local` is gitignored and dockerignored. `git status` does not stage `.env.local` or `cal-html.txt`. README has no real ICS URL and no PIN. Calendar JSON shape has no `icsUrl` field |
| Viewport 1180×820 | Browser at 1180×820 on 4-week, week, and day: no document scrollbar; document `scrollHeight` does not exceed the layout viewport; background `#0a0a0f`; the stage fills that viewport |
| Larger sizes | At 1366×1024 and 1920×1080 the stage fills the viewport. Document still does not scroll |
| Smaller window | Below 1180 on either edge, the 1180×820 layout scales down. Document still does not scroll |
| Week grid only | On week view the time grid scrolls (`scrollHeight` greater than client height, `overscroll-behavior: contain`). Month and day do not scroll the document. Document scroll position stays 0 |
| Untouched | `middleware.ts`, auth routes, `lib/config.ts`, `lib/calendar-engine.ts`, `lib/demo-data.ts`, weather route, clock, `DashboardShell`, month, week, day, `FilterBar`, idle reset, swipe, `LockControl`, `Dockerfile`, `docker-compose.yml`, and `.env.example` unchanged unless a row above failed |

**Do not start a Phase 10 after this gate.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Blocked by**: Phases 1, 1.5, 2, 3, 4, 5, 6, 7, and 8 complete (demo mode, PIN-gate, calendar engine, weather, layout, month, week, day, filters, idle reset, swipe, Docker).
- **T056**: README rewrite. No engine or view edits.
- **T057**: Secret and ignore check. No dependency on T056. Read-only unless a leak is found.
- **T058**: Depends on T056 and T057. Browser verification of demo mode and the three viewports.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Fresh clone runs demo with no secrets | T056, T058 | T058: `/` is the demo wall, health is `mode: "demo"`, README demo steps match |
| US2 Operator attaches real feeds without putting them in git | T056, T057 | T057: ignores hold, `.env.example` URLs stay empty, README operator section matches Compose and Vercel env |
| US3 Shipped wall still passes the device sizes | T058 | T058: 1180×820, 1366×1024, and 1920×1080 fill; smaller than 1180 scales down; only the week time grid scrolls |

### Parallel Opportunities

```text
After spec approval + "implement Phase 9":
  T056 (README.md) and T057 (secret / ignore check) in parallel
  then T058 (browser verification on demo mode)
```

T056 and T057 touch different concerns. T057 does not wait on the README
text. T058 needs the README in place so the demo section can be checked
against the running app.

---

## Implementation Strategy

1. Wait for human approval of this file and
   `.spec/specifications/09-real-feeds.md`.
2. Execute T056–T058 only after the explicit instruction
   **implement Phase 9**. Approval of these two files is not that
   instruction.
3. Run Phase 9 Verification in the browser on demo mode at 1180×820,
   1366×1024, and 1920×1080 → stop if any check fails.
4. Stop. Do not implement a Phase 10.

### MVP increment for this feature

US1 (README demo path matches a clone with no feeds) is the smallest
complete slice. US2 and US3 are required before calling Phase 9
complete: the operator section has to stay secret-free, and the device
sizes have to pass on the shipped wall.

---

## Notes

- Real ICS fetch already exists. This phase documents it. It does not
  add a second config channel.
- `fixture:mock.ics` is live mode, not the public demo. The public demo
  is an empty `CAL_*_URL` set.
- `/?demo=1` is development-only. Production with feeds stays on the
  PIN-gate.
- Do not commit `.env.local` or `cal-html.txt`.
- Do not rewrite the phase table in `.spec/project.md`.
- Browser verification is part of T058. A screenshot is not enough.
  Confirm demo mode, the three viewports, document scroll staying at
  zero, and vertical scroll only inside the week time grid.
