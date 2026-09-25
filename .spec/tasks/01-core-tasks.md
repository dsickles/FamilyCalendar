# Tasks: Core Scaffolding, PWA Shell & PIN-Gate Security

**Input**: `.spec/specifications/01-core-and-security.md`
**Constitution**: `.spec/constitution.md` (v1.1.0)
**Project context**: `.spec/project.md`
**Source**: Implementation Master Plan — Phase 1 and Phase 1.5
**Status**: Phase 1 / 1.5 human review complete 2026-09-21. T001–T020 implemented. Rate-limit leftover reviewed and tested 2026-09-21. Do not start Phase 2 until a new chat explicitly asks for it.

**Tests**: Not requested as a separate TDD suite. Each phase has a
**Verification** gate copied from the Master Plan; those gates MUST pass
before later-phase work starts.

**Organization**: Phase 1 (scaffold) then Phase 1.5 (auth). Phase 1.5
depends on Phase 1 files existing.

## Format

`- [ ] Tnnn [P?] [US?] Step X.Y — description (files)`

- **[P]**: Safe to run in parallel (different files, no dependency)
- **[US1–US4]**: Maps to user stories in the specification
- Step IDs (`1.1` … `1.11`, `1.5.1` … `1.5.7`) are the Master Plan IDs

## Path Conventions

Repository root is the Next.js app (no `src/` directory; `--src-dir=false`).

---

## Phase 1: Project Scaffolding & Configuration

**Purpose**: Bootable Next.js project with Tailwind v4, type definitions,
env loader, PWA shell, kiosk CSS, icons, and Docker-ready Next config.

**Master Plan goal**: Bootable Next.js project with Tailwind v4, all type
definitions, and config files in place.

- [x] T001 [US3] Step 1.1 — Scaffold Next.js project at repository root:
      `npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack`.
      Files: `package.json`, Next/TS/ESLint/PostCSS configs, `app/` skeleton.
- [x] T002 Step 1.2 — Install runtime dependencies `node-ical swr framer-motion lucide-react`
      and dev dependency `@types/node`. File: `package.json`.
- [x] T003 [US3] Step 1.3 — Configure Tailwind v4 in `postcss.config.mjs`
      (`@tailwindcss/postcss`) and `app/globals.css` (`@import "tailwindcss"`
      plus `@theme` block: color palette from Master Plan Appendix A, Inter
      font family, spacing scale, breakpoints).
- [x] T004 [P] [US1] Step 1.4 — Create type definitions verbatim from
      spec data contracts in `lib/types/calendar.ts` (`RawIcsEvent`,
      `UnifiedEvent`), `lib/types/weather.ts` (`WeatherData`),
      `lib/types/ui-state.ts` (`CalendarViewMode`, `CalendarViewState`).
      `CalendarSource` and `DashboardConfig` live in `lib/config.ts` (or
      are re-exported from types — do not invent a third copy).
- [x] T005 [US1] Step 1.5 — Create env-based config loader in `lib/config.ts`:
      `getCalendarSources()` scans `process.env` for `CAL_*` prefixed vars
      and returns `CalendarSource[]`; `getDashboardConfig()` reads config
      env vars with spec defaults; `isDemoMode()` returns true if no
      `CAL_*_URL` vars have values. `icsUrl` MUST remain server-only.
- [x] T006 [P] [US1] Step 1.6 — Create committed `.env.example` documenting
      all env vars and comments from Master Plan §1A (auth, weather,
      calendar feed pattern, dashboard preferences). Secrets empty.
- [x] T007 [P] [US1] Step 1.7 — Create/update `.gitignore` so `.env.local`,
      `.env.*.local`, `.next/`, `out/`, `node_modules/`, `.DS_Store`,
      `*.swp`, `.vscode/`, `.idea/` are excluded.
- [x] T008 [US3] Step 1.8 — Set up PWA manifest in `app/manifest.ts` and
      Apple/viewport meta in `app/layout.tsx` exactly as Master Plan §3.1
      and §3.2 (name, standalone, landscape, `#0a0a0f`, icons, Apple
      web-app capable, `maximumScale: 1`, `userScalable: false`,
      `viewportFit: "cover"`, explicit Apple meta tags in `<head>`).
- [x] T009 [US3] Step 1.9 — Apply kiosk CSS resets from Master Plan §3.3
      to `app/globals.css` (`overflow: hidden`, `overscroll-behavior: none`,
      `touch-action: manipulation`, no callout, no user-select, `position:
      fixed; inset: 0`, safe-area padding, `.gpu-layer`).
- [x] T010 [P] [US3] Step 1.10 — Generate `public/icons/icon-192x192.png`
      and `public/icons/icon-512x512.png` (simple calendar glyph).
- [x] T011 [US4] Step 1.11 — Configure Next.js for Docker in
      `next.config.ts`: `output: "standalone"`.

### Phase 1 Verification (Master Plan)

`npm run dev` boots without errors. Visiting `/` shows a blank dark page
with correct meta tags visible in DevTools. `.env.example` exists in the
repo. `.env.local` is gitignored.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Dev server boots | `npm run dev` exits 0 into ready state; no compile errors |
| Dark blank `/` | Background `#0a0a0f`; no widgets yet |
| Meta tags | DevTools `<head>` contains Apple web-app + non-scalable viewport |
| Manifest | Manifest route returns standalone + landscape + icon entries |
| Viewport | Chrome device emulation 1180×820: no document scrollbar, no overscroll |
| Secrets | `.env.example` tracked; `git check-ignore .env.local` succeeds |
| Types | `lib/types/*.ts` and `lib/config.ts` compile against the spec contracts |

**Do not start Phase 1.5 until this gate passes.**

---

## Phase 1.5: Authentication & Security Scaffolding

**Purpose**: PIN-gate middleware protecting all routes, unlock page, explicit
relock, demo mode fallback, health probe, and Docker packaging.

**Master Plan goal**: PIN-gate middleware protecting all routes, with a
beautiful unlock page and demo mode fallback. **Amendment:** explicit
relock endpoint + fat-finger-safe lock UI (idle MUST NOT PIN-lock).

- [x] T012 [P] [US2] Step 1.5.1 — Implement auth utilities in `lib/auth.ts`:
      `hashPin(pin: string): string` (SHA-256 hash for cookie token),
      `verifyPin(pin: string, envPin: string): boolean`,
      `createSessionCookie(): string` (signed token),
      `verifySessionCookie(token: string): boolean`,
      `clearSessionCookie()` (expire `dash_session` with Max-Age=0, same
      flags as create). Rate limiter:
      `Map<string, { count: number; resetAt: number }>` tracking attempts
      per IP (5 / 15 minutes).
- [x] T013 [US1] [US2] Step 1.5.2 — Implement `middleware.ts`: check
      `dash_session` on every request; missing/invalid → redirect
      `/unlock`. Skip: `/unlock`, `/api/auth/unlock`, `/api/health`,
      `/_next/`, `/icons/`, manifest route. **Critical:** if
      `isDemoMode()` is true, skip auth entirely.
- [x] T014 [US2] Step 1.5.3 — Implement `app/api/auth/unlock/route.ts`
      `POST`: read `pin` from JSON body, enforce rate limit, verify
      against `DASHBOARD_PIN`, set `dash_session` httpOnly cookie
      (30-day maxAge, `sameSite: "strict"`, `secure: true` in production,
      `path: "/"`), return 200 or 401.
- [x] T015 [US2] Step 1.5.4 — Build `app/unlock/page.tsx` touch-optimized
      PIN pad: 3×4 grid of large circular buttons (0–9, backspace,
      submit). Dark aesthetic. Framer Motion entrance. App name/logo at
      top. Error shake on wrong PIN. No visible PIN hints. Hit targets
      ≥ 44×44pt.
- [x] T016 [P] [US1] Step 1.5.5 — Implement `lib/demo-data.ts`
      `generateDemoEvents(): UnifiedEvent[]` — ~25–30 realistic events
      across "Alex", "Jordan", "Family", "School". Relative to current
      date (morning meetings, afternoon activities, all-day, weekly
      recurring). Deterministic seed so events are stable within a day.
- [x] T017 [P] [US4] Step 1.5.6 — Implement `app/api/health/route.ts`
      `GET` returning `{ status: "ok", mode: "live" | "demo", timestamp }`.
      Not behind auth. Used by Docker healthcheck.
- [x] T018 [US4] Step 1.5.7 — Create `Dockerfile` and `docker-compose.yml`
      from Master Plan §1C: multi-stage Node 20 Alpine, standalone copy,
      compose `env_file: .env.local`, `3000:3000`, `restart: unless-stopped`,
      healthcheck `curl -f http://localhost:3000/api/health` interval 60s
      timeout 5s retries 3. Do not bake secrets into the image.
- [x] T019 [US5] Step 1.5.8 — Implement `app/api/auth/lock/route.ts` `POST`:
      call `clearSessionCookie()`, return 200. Route is PIN-gated (not on
      the middleware skip list). In demo mode, no-op 200. Does not revoke
      other browsers' cookies.
- [x] T020 [US5] Step 1.5.9 — Build `components/layout/LockControl.tsx` and
      mount it from `app/page.tsx`. Live mode only (hidden when
      `isDemoMode()`). Muted Lucide `Lock` icon, ≥ 44×44pt hit target,
      bottom-left. Tap opens confirm overlay: "Lock dashboard? PIN will
      be required." Cancel is the default/larger action; Lock confirms
      then `POST /api/auth/lock` and navigates to `/unlock`. Idle timers
      MUST never call this endpoint.

### Phase 1.5 Verification (Master Plan + relock amendment)

Without `.env.local` PIN set → dashboard loads in demo mode (no PIN
required). With `DASHBOARD_PIN=1234` (and a `CAL_*_URL` so demo mode is
off) → all protected routes redirect to `/unlock`. Entering correct PIN
→ cookie set, dashboard accessible. Entering wrong PIN 5 times → rate
limited. `GET /api/health` returns 200 always.

**Pass criteria**:

| Check | Evidence |
|-------|----------|
| Demo mode | No `.env.local` calendar URLs → `GET /` is 200, no redirect |
| Live lock | `DASHBOARD_PIN` + `CAL_*_URL` set → `GET /` redirects `/unlock` |
| Unlock success | `POST /api/auth/unlock` `{ "pin": "1234" }` → 200 + `Set-Cookie: dash_session` httpOnly |
| Unlock failure | Wrong PIN → 401, no session cookie, shake on UI |
| Rate limit | 5 failures / 15 min / IP; further attempts denied until window reset |
| Rate-limit UI vs refresh | After 5 failures, refresh `/unlock` keeps the pad locked until `resetAt`; `GET /api/auth/unlock` returns 429 + `resetAt`; a later correct PIN still 429 (reviewed and tested 2026-09-21) |
| API gating | Unauthenticated `GET /api/calendar` and `GET /api/weather` do not return private data (redirect or deny) |
| Health | `GET /api/health` is 200 with and without a cookie; body includes `mode` |
| Cookie flags | `httpOnly`, `sameSite=strict`, `path=/`; `secure` in production only |
| Bundle gate | Client bundle has no PIN, no ICS URL, no `DASHBOARD_PIN` |
| Docker files | `Dockerfile` + `docker-compose.yml` present and secret-free |
| Explicit relock | Unlocked session → confirm Lock → `dash_session` expired → `GET /` redirects `/unlock` |
| Relock cancel | Tap lock icon, Cancel → cookie unchanged, still on `/` |
| Demo hides lock | No `CAL_*_URL` → lock control not in the DOM |
| Idle does not PIN-lock | Session cookie still valid after `IDLE_TIMEOUT_MS` with no lock action |

**Do not start Phase 2 (calendar engine) until this gate passes.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (T001–T011)**: No prior application code. T001 blocks T002+.
  T004/T006/T007/T010 may run in parallel after T001. T005 depends on
  T004. T008–T009 depend on T003.
- **Phase 1.5 (T012–T020)**: Blocked by Phase 1 verification. T013
  depends on T005 (`isDemoMode`) and T012 (`verifySessionCookie`). T014
  depends on T012. T015 depends on T014. T016 and T017 are parallel
  after T004. T018 can start after T011 and T017. T019 depends on T012
  (`clearSessionCookie`). T020 depends on T019 and T005.

### User Story Mapping

| Story | Tasks | Independent after |
|-------|-------|-------------------|
| US1 Demo clone | T004, T005, T006, T007, T013, T016 | T013 + T016 |
| US2 PIN-gate | T012, T013, T014, T015 | T015 |
| US5 Explicit relock | T012, T019, T020 | T020 |
| US3 PWA / kiosk shell | T001, T003, T008, T009, T010 | T009 |
| US4 Health / Docker | T011, T017, T018 | T018 |

### Parallel Opportunities

```text
After T001:
  T004, T006, T007, T010 in parallel

After Phase 1 verification:
  T012, T016, T017 in parallel
  then T013 + T014 (T014 uses T012)
  then T015
  T018 after T011 + T017
  T019 after T012; T020 after T019 + T005
```

---

## Implementation Strategy

1. Spec files were approved 2026-09-21. Execute T001–T020 in order.
2. Complete Phase 1 → run Phase 1 Verification → stop if any check fails.
3. Complete Phase 1.5 → run Phase 1.5 Verification → stop if any check fails.
4. Only then generate Phase 2 specifications (calendar engine).

### MVP increment for this feature

Phase 1 + US1 (demo boot) is the smallest demoable slice. US2 (PIN-gate)
is required before any live feed work. US3 and US4 are required before
iPad / NAS install.

---

## Notes

- Step IDs match the Master Plan so reviews can diff task text against
  the plan tables.
- Constitution gates (viewport, bundle, auth, uptime, secret) apply to
  the Phase 1.5 verification table even when the Master Plan phrasing
  is shorter.
- Fail-closed rule from the spec: if any `CAL_*_URL` is set, auth runs;
  if PIN is missing in that state, unlock cannot succeed.
- Idle timeout (Phase 8) restores month view only. It MUST NOT lock.
- Spec approval recorded 2026-09-21.
- Rate-limit leftover (unlock pad vs refresh) reviewed and tested 2026-09-21.
