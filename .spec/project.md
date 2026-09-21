# Family Wall Dashboard — Project Context

**Status**: Approved 2026-09-21
**Constitution**: `.spec/constitution.md` (canonical Spec Kit copy: `.specify/memory/constitution.md` v1.1.0)
**Scope of this document**: Vision, hardware, deployment architecture, and locked tech stack.

## Vision

Build a **zero-subscription family kiosk appliance**: a modular, touch-optimized,
full-screen PWA wall dashboard (DAKboard alternative) that a household can
glance at from ~3 feet. It is not a general website, not a SaaS product, and
not a mobile app with navigation chrome.

The running instance shows private family calendars and local weather. The
GitHub repository is public; a live kiosk is not. Those two surfaces share
code, never secrets. A fresh clone boots into **demo mode** with realistic
sample events. A real deployment — **QNAP or Vercel** — loads live ICS feeds
behind the **same PIN-gate**. Once this iPad is unlocked, it is a view-only
wall: the PIN pad does not return on a timer.

## Product Intent

| Intent | Meaning |
|--------|---------|
| Wall appliance | Always-on, landscape, Guided Access, ambient month view |
| Family kiosk | Multi-calendar overlay (people, shared, utility, holidays) |
| Touch-first | 44×44pt targets, no hover-only affordances, fat-finger safe |
| Zero subscription | Self-hosted; Open-Meteo weather; ICS feeds the family already has |
| Portfolio-safe | Public repo + demo data; live family data never in git or client JS |

## Target Hardware

| Target | Role | CSS / physical bound |
|--------|------|----------------------|
| **iPad Air (4th gen, 2020)** | Primary kiosk | **1180×820** landscape, Guided Access, Add to Home Screen |
| 13" iPad Pro | Scale-up | 1366×1024 landscape |
| Desktop / wall browser | Secondary | 1920×1080; must not overflow |

Primary device assumptions:

- Safari (iOS) standalone PWA after "Add to Home Screen"
- Guided Access enabled; hardware buttons disabled except Touch
- Display auto-lock set to Never
- Viewing distance ~3 ft (arm's-length wall mount)
- Same LAN as the QNAP NAS (primary path)

Resolved locale defaults (overridable via env, never hardcoded as secrets):

| Preference | Default |
|------------|---------|
| Location | Scarsdale, NY 10583 — `40.9892°N, 73.7944°W` |
| Timezone | `America/New_York` |
| Time format | 12-hour (AM/PM) |
| Temperature | Fahrenheit |
| Week start | Sunday (`WEEK_START_DAY=0`) |
| Calendar idle reset | 90 seconds — return to month **view**, never PIN |
| Calendar cache TTL | 600 seconds |
| Weather cache TTL | 1800 seconds |

### Idle timeout (calendar only — not a PIN lock)

`IDLE_TIMEOUT_MS` (default 90_000) is a **view-reset**, not a session
timeout. The wall iPad is mostly glance/view-only after the first unlock.

| After 90s with no touch | What happens | What does **not** happen |
|-------------------------|--------------|---------------------------|
| User is on Week or Day view | UI returns to the ambient 4-week **month** grid (today as anchor) | PIN pad does not appear |
| User is already on Month view | Nothing | Cookie stays valid |
| Session cookie | Unchanged (30-day `dash_session`) | Cookie is not expired |

PIN is required again only after **explicit lock** (`POST /api/auth/lock`)
or when the 30-day cookie expires / is cleared. Phase 8 implements the
calendar idle reset and MUST NOT call the lock endpoint.

## Dual-Path Deployment Architecture

```text
                    ┌─────────────────────────────────┐
                    │  Public GitHub repo (no secrets) │
                    │  Demo mode if no CAL_*_URL       │
                    └──────────────┬──────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
              ▼                                         ▼
   ┌─────────────────────┐                   ┌─────────────────────┐
   │ Path A — PRIMARY    │                   │ Path B — OPTIONAL   │
   │ Docker on QNAP NAS  │                   │ Vercel              │
   │ LAN + same PIN-gate │                   │ Same PIN-gate       │
   │ :3000               │                   │ + optional Vercel   │
   │                     │                   │   Auth layer        │
   └─────────┬───────────┘                   └─────────┬───────────┘
             │                                         │
             ▼                                         ▼
   iPad Air 2020 (same LAN)                  Remote / travel access
   PIN once → Home Screen → Guided Access    Family PIN unlock
   then view-only wall                       (same app PIN-gate)
```

Both paths run the **same Next.js PIN-gate**. LAN isolation on Path A is
extra defense, not a substitute. Demo mode (no `CAL_*_URL`) is the only
path that skips the PIN.

### Path A — Docker on QNAP NAS (primary kiosk)

Most private option. The dashboard stays on the home network **and** still
requires the application PIN. Constitution: both deploy paths MUST enforce
the PIN-gate.

- Multi-stage `Dockerfile` (Node 20 Alpine builder + standalone runner)
- `docker-compose.yml`: port `3000:3000`, `env_file: .env.local` (includes
  `DASHBOARD_PIN` and `CAL_*` feeds), `restart: unless-stopped`,
  healthcheck against `/api/health`
- Next.js MUST build with `output: "standalone"`
- iPad on the same LAN opens `http://<NAS-IP>:3000` → PIN pad on first
  visit → Add to Home Screen → Guided Access. After that the wall is
  view-only until explicit lock or cookie expiry
- No public port forwarding. NAS is not internet-routable by design.
  Anyone else on the Wi‑Fi still hits the PIN-gate

### Path B — Vercel (optional, protected)

For access outside the home network. Same PIN-gate as Path A; Vercel is
not a different auth model.

- GitHub integration deploy
- `CAL_*` and `DASHBOARD_PIN` set as Vercel Environment Variables
- Application PIN-gate is mandatory (identical middleware as QNAP)
- Vercel Deployment Protection (Vercel Authentication) MAY be a second
  layer; it MUST NOT replace the PIN-gate
- Hobby-plan Vercel Auth restricts the URL to the operator's Vercel
  account; family members without Vercel accounts use the PIN-gate

## Tech Stack (Locked)

Resolved in the Master Plan. Do not substitute without a constitution
amendment plus a plan revision.

| Layer | Choice | Pin |
|-------|--------|-----|
| Framework | Next.js App Router | `next ^15.0.0` |
| UI | React 19 | `react ^19.0.0`, `react-dom ^19.0.0` |
| Language | TypeScript | `typescript ^5.6.0` |
| Styling | Tailwind CSS v4 (CSS-first, Oxide) | `tailwindcss ^4.3.0`, `@tailwindcss/postcss ^4.3.0` |
| Motion | Framer Motion | `framer-motion ^12.0.0` |
| Icons | Lucide React | `lucide-react ^0.460.0` |
| Calendar parse | node-ical (RRULE expansion) | `node-ical ^0.20.0` |
| Client data | SWR | `swr ^2.3.0` |
| Weather | Open-Meteo (no API key) | HTTPS forecast API |
| Runtime (kiosk) | Node 20 Alpine in Docker | QNAP Container Station |
| Runtime (optional) | Vercel | Hobby-compatible |
| PWA | `app/manifest.ts` + Apple web-app meta | standalone / landscape |

Scaffold command (Phase 1, **not executed until spec approval**):

```text
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

## High-Level Runtime Shape

```text
iPad / Browser
  PWA Shell (root layout)
    PIN-gate middleware ── missing cookie → /unlock
    DashboardPage
      ClockWidget | WeatherWidget | FilterBar
      CalendarViewMachine → Month (4-week) | Week | Day

Server
  /api/auth/unlock     PIN → httpOnly dash_session cookie
  /api/auth/lock       expire dash_session (this browser only)
  /api/calendar        CalendarEngine + 10 min in-memory cache
  /api/weather         Open-Meteo + 30 min in-memory cache
  /api/health          Unauthenticated Docker probe
```

Client-side filter chips never refetch; they subset already-fetched
`UnifiedEvent[]`. ICS fetch, parse, RRULE expand, and TZ normalize happen
only on the server.

## Configuration Model

All runtime config is environment-variable-driven (`lib/config.ts` once
implemented). Sensitive keys:

- `DASHBOARD_PIN` — 4–8 digit PIN, server-side only
- `CAL_<ID>_URL` — ICS subscription URLs, server-side only
- `CAL_<ID>_LABEL`, `CAL_<ID>_COLOR`, `CAL_<ID>_CATEGORY` — safe to expose
  as metadata (not the URL)

Non-secret defaults (also env, documented in `.env.example`):

- `WEATHER_LAT`, `WEATHER_LON`, `WEATHER_DISPLAY_NAME`
- `TIMEZONE`, `TEMPERATURE_UNIT`, `TIME_FORMAT`, `WEEK_START_DAY`
- `IDLE_TIMEOUT_MS` (calendar view-reset only; MUST NOT PIN-lock)
- `CACHE_REVALIDATE_SECONDS`

`isDemoMode === true` when no `CAL_*_URL` values are set.

## Implementation Phasing (context only)

| Phase | Intent | Spec status |
|-------|--------|-------------|
| 1 | Project scaffolding, types, PWA, kiosk CSS | Review complete 2026-09-21 |
| 1.5 | PIN-gate, unlock UI, explicit relock, demo data, Docker, health | Review complete 2026-09-21; leftover (rate-limit UI vs refresh) reviewed and tested 2026-09-21 |
| 2 | Calendar data engine | Deferred — do not start until a new chat says so |
| 3 | Weather data engine | Deferred |
| 4 | Base layout and ambient widgets | Deferred |
| 5 | Month view (4-week rolling) | Deferred |
| 6 | Week and Day views | Deferred |
| 7 | Filter bar | Deferred |
| 8 | Calendar idle reset (back to month view, not PIN) and kiosk polish | Deferred |
| 9 | Real feeds, device test, README | Deferred |

Phase 1 / 1.5 human review complete 2026-09-21. Rate-limit leftover reviewed and tested 2026-09-21. Next slice (Phase 2) requires a new Agent chat and an explicit "implement Phase 2" instruction.

## Related Spec Kit Artifacts

| Artifact | Path |
|----------|------|
| Constitution (review copy) | `.spec/constitution.md` |
| Constitution (Spec Kit canonical) | `.specify/memory/constitution.md` |
| This context | `.spec/project.md` |
| Phase 1 / 1.5 specification | `.spec/specifications/01-core-and-security.md` |
| Phase 1 / 1.5 tasks | `.spec/tasks/01-core-tasks.md` |
