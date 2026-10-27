# Family Wall Dashboard — Project Context

**Status**: Rewritten 2026-10-27 for the Anna Bella PF1508 frame, pending owner approval.
**Constitution**: `.spec/constitution.md` (canonical Spec Kit copy: `.specify/memory/constitution.md` v2.0.0)
**Scope of this document**: Vision, hardware, deployment architecture, locked tech stack, owner decisions, and the phase plan.

## Vision

Build a **zero-subscription family kiosk appliance** on a 15.6" wall frame:
a touch-first, full-screen, tabbed family wall that a household can glance
at from across the kitchen. Today is the home screen. Calendar, Meals,
Shopping, To-dos, and Photos are one tap away on a left rail. It replaces
Cozi or DAKboard without a monthly bill.

The wall reads private family calendars, local weather, and a private photo
folder, and it keeps a shared shopping list, to-dos, meal plans, and notes.
Dan's wife adds to the list and to-dos from a phone page. Dan's bots plan
meals, add list items, and post notes through a keyed API. The GitHub
repository is public; the live wall is not. A fresh clone boots into
**demo mode** with sample data. The live install runs behind the
**PIN-gate**. Once the frame is unlocked it stays unlocked until someone
locks it on purpose.

The tab design comes from
[wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard),
rebuilt on this repo's Next.js stack with a real server behind it. The
frame setup (ADB, kiosk app) follows that repo's
[PF1508 write-up](https://github.com/wesbos/photo-frame-dashboard/blob/main/docs/allwinner-a333-pf1508.md).

## Product Intent

| Intent | Meaning |
|--------|---------|
| Wall appliance | Always-on landscape frame, kiosk app as Home, Today as the resting screen |
| Family hub | Calendars, weather, meals, one shopping list, to-dos, notes, photos |
| Touch-first | 44×44 CSS px targets, no hover-only affordances, read from across the room |
| Shared writes | Wall, phone page, and bots all write to one server-side store |
| Zero subscription | Free tiers only: Vercel Hobby, Upstash Redis free, Open-Meteo, Google Drive |
| Portfolio-safe | Public repo + demo data; live family data never in git or client JS |

## Target Hardware

There is one target device.

| Item | Value |
|------|-------|
| Device | Anna Bella 15.6" digital frame, model **PF1508** |
| Firmware | `YHK.F-null-A333-1506-D2048-C2-V10-PF1508-OS.0.20260725` (confirmed on Dan's unit 2026-10-22) |
| Chip / RAM / storage | Allwinner A333, 2 GB (1.8 GB reported), 16 GB |
| OS | Android 15 (SDK 35), AiMOR 6.0.100, `user` build, no root |
| Browser engine | Android System WebView **124.0.6367.219**, the only provider, not updatable |
| Screen | **1920×1080** at 160 dpi (device pixel ratio 1), touch, no navigation bar |
| Shell | Project kiosk app (from wesbos `dashboard/kiosk`, target SDK 28) set as Home |
| Mount | Kitchen wall, home Wi-Fi |

Frame setup facts (from the PF1508 write-up and the feasibility thread):

- ADB turns on through About › tap Model › factory test app (password from
  wesbos issue #135) › tick "adb调试". No root needed.
- Do not take AiMOR updates before ADB is on; a newer build could close the
  factory test menu.
- After `set-home-activity`, wait about 30 seconds before rebooting or the
  Home setting is lost.
- The frame has no navigation bar. The kiosk app's accessibility service
  provides Back and Dashboard buttons.

Other browsers (desktop, iPad, landscape phones) are best-effort. The phone
page `/list` is gated at a 390×844 portrait phone.

Locale defaults (overridable via env, never secrets):

| Preference | Default |
|------------|---------|
| Location | Scarsdale, NY 10583 — `40.9892°N, 73.7944°W` |
| Timezone | `America/New_York` |
| Time format | 12-hour (AM/PM) |
| Temperature | Fahrenheit |
| Week start | Sunday (`WEEK_START_DAY=0`) |
| Idle reset | 90 seconds — any tab except Photos returns to Today, never the PIN |
| Calendar cache TTL | 600 seconds |
| Weather cache TTL | 1800 seconds |
| Photo list TTL | 1800 seconds |
| Travel buffer for "Leave in" | 15 minutes per calendar |

## Owner Decisions

The five decisions from the Family wall redesign plan, plus the ones this
rewrite needed. Dan asked on 2026-10-27 for the repo to describe only the
Anna Bella kiosk, so the plan's recommendations are taken as decided. Change
any row by amending this table.

| # | Decision | Choice |
|---|----------|--------|
| D1 | Where the live wall runs | **Vercel** (reachable by the phone page and bots from anywhere). Docker on a NAS stays supported for LAN-only use. |
| D2 | Where saved data lives | **Upstash Redis** free tier through the Vercel Marketplace. Docker uses a JSON file on a mounted volume behind the same interface. |
| D3 | How Dan's wife adds to the list and to-dos | A **phone page** at `/list`, behind the PIN, saved to her home screen. It asks for a name once and remembers it on that phone. |
| D4 | How bots get in | A **key per bot**, each limited to listed scopes, revocable on its own. Plain HTTPS API plus an MCP endpoint over the same actions. |
| D5 | How photos are read | A **Google service account** shares one private Drive folder, view-only. The server lists and resizes; the frame never sees Drive URLs. |
| D6 | Which devices are gated | Only the PF1508 at 1920×1080, plus `/list` at 390×844. The iPad sizes are no longer gated. |
| D7 | The old calendar wall at `/` | **Retired.** The tabbed wall moves to `/`. `/wall` redirects to `/`. |
| D8 | Idle behavior | Return to **Today** (Photos is left alone). |
| D9 | "Leave in" travel time | A fixed buffer per calendar (default 15 minutes). No paid maps API. |

## Deployment Architecture

```text
                ┌──────────────────────────────────┐
                │ Public GitHub repo (no secrets)   │
                │ Demo mode if no CAL_*_URL         │
                └──────────────┬───────────────────┘
          ┌────────────────────┼─────────────────────┐
          ▼                    ▼                     ▼
 ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
 │ Live — PRIMARY   │ │ Docker — LAN     │ │ Public demo      │
 │ Vercel project   │ │ NAS :3000        │ │ separate Vercel  │
 │ PIN, feeds,      │ │ PIN, feeds,      │ │ project, no      │
 │ Upstash, Drive,  │ │ file store,      │ │ secrets, sample  │
 │ bot keys         │ │ Drive, bot keys  │ │ data only        │
 └───┬─────┬────┬───┘ └──────────────────┘ └──────────────────┘
     │     │    │
     ▼     ▼    ▼
  Frame  Phone  Bots
  (kiosk  /list  /api/bot/* + /api/mcp
   app)   (PIN)  (per-bot key)
```

All three run the same code. The PIN-gate, demo rule, and caps are
identical. Demo mode never touches a store, Drive, or bot keys.

### Live — Vercel (primary)

- GitHub integration deploy of `master`.
- Environment variables: `DASHBOARD_PIN`, `CAL_*`, the Upstash REST URL
  and token (set by the Upstash Marketplace integration),
  `GOOGLE_SERVICE_ACCOUNT_JSON`, `PHOTOS_DRIVE_FOLDER_ID`, and
  `BOT_<ID>_KEY` / `BOT_<ID>_NAME` / `BOT_<ID>_SCOPES` per bot.
- The kiosk app's start URL is the live deployment's HTTPS address, set on
  the frame (never committed).

### Docker on a NAS (supported, LAN only)

- Multi-stage `Dockerfile` (Node 20 Alpine builder + standalone runner).
- `docker-compose.yml`: port `3000:3000`, `env_file: .env.local`,
  `restart: unless-stopped`, healthcheck against `/api/health`, and a
  volume for the store file (`STORE_FILE`).
- No public port forwarding. The phone page and bots work only on the home
  network.

### Public demo

`familycalendar-demo.vercel.app`: a separate Vercel project with no
`CAL_*_URL`, no PIN, no store, no Drive, no bot keys. It shows sample
events, lists, meals, and stock photos, and refuses bot writes.

## Tech Stack (Locked)

Do not substitute without a constitution check plus a plan revision. Pins
match `package.json` as of 2026-10-27, except where a phase adds a package.

| Layer | Choice | Pin |
|-------|--------|-----|
| Framework | Next.js App Router | `next 16.3.5`, `eslint-config-next 16.3.5` |
| UI | React 19 | `react 19.2.8`, `react-dom 19.2.8` |
| Language | TypeScript | `typescript ^5` |
| Styling | Tailwind CSS v4 plus `app/wall/wall.css` | `tailwindcss ^4`, `@tailwindcss/postcss ^4` |
| Browser target | Browserslist pinned in `package.json`, never above Chrome 124 | Phase 10 |
| Fonts | `next/font/google` (Archivo, Instrument Serif), bundled at build | — |
| Motion | CSS transitions; Framer Motion only on `/unlock` | `framer-motion ^13.4.0` |
| Icons | Lucide React | `lucide-react ^1.47.0` |
| Calendar parse | node-ical (RRULE expansion) | `node-ical ^0.27.2` |
| Client data | SWR | `swr ^2.5.1` |
| Validation | Zod schemas for every write | Phase 11 adds `zod` |
| Store | Upstash Redis REST (live), JSON file (Docker), memory (demo, tests) | Phase 11 adds `@upstash/redis` |
| Bot MCP | MCP TypeScript SDK, Streamable HTTP at `/api/mcp` | Phase 11 adds `@modelcontextprotocol/sdk` |
| Photos | Google Drive API v3 with a service account; `sharp` resizes | Phase 14 adds `google-auth-library`, `sharp` |
| Weather | Open-Meteo (no API key) | HTTPS forecast API |
| Tests | Vitest (unit), Playwright (e2e, current Chromium and Chromium 124) | `vitest ^3.2.7`, `@playwright/test ^1.64.1` |
| Kiosk app | Java, no Gradle, from wesbos `dashboard/kiosk` | `kiosk/` in this repo, Phase 15 |
| Runtime | Vercel (primary), Node 20 Alpine in Docker (LAN) | — |

## High-Level Runtime Shape

```text
PF1508 frame
  Kiosk app (Home, landscape, keep-awake, crash recovery)
    WebView 124 → https://<live>/
      PIN-gate proxy ── no cookie → /unlock
      WallApp
        Rail: Today | Calendar | Meals | Shopping | To-dos | Photos, clock, lock
        Today: header (clock, weather, hourly), Next up + photo tile,
               lanes per person, dinner / list / to-do / note tiles
        Calendar: Month (rolling 4 weeks, paging) | Week | Day (other days)
        Meals: today's meals, dinner cooking card, next dinners strip
        Shopping: one list by aisle
        To-dos: open to-dos by owner
        Photos: full-screen slideshow, clock

Phone
  /list (PIN) → Shopping and To-dos for adding and ticking

Bots
  /api/bot/* (HTTPS) and /api/mcp (MCP) → per-bot key + scopes

Server
  /api/auth/unlock | /api/auth/lock      PIN → dash_session cookie
  /api/calendar                          ICS engine + 600s cache
  /api/weather                           Open-Meteo + 1800s cache (daily + hourly)
  /api/wall                              saved data read/write (PIN)
  /api/photos, /api/photos/<id>          Drive list (1800s) + resized bytes (PIN)
  /api/bot/*, /api/mcp                   bot actions (key)
  /api/health                            unauthenticated probe
  Store: Upstash Redis | JSON file | memory
```

## Configuration Model

All runtime config is environment-variable-driven (`lib/config.ts`).

Secrets (server-side only):

- `DASHBOARD_PIN` — 4–8 digit PIN
- `CAL_<ID>_URL` — ICS subscription URLs
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`) — Upstash store (live)
- `GOOGLE_SERVICE_ACCOUNT_JSON`, `PHOTOS_DRIVE_FOLDER_ID` — photos
- `BOT_<ID>_KEY` — one per bot

Non-secret (also env, documented in `.env.example`):

- `CAL_<ID>_LABEL`, `CAL_<ID>_COLOR`, `CAL_<ID>_CATEGORY` (a `person`
  calendar gets its own lane on Today), `CAL_<ID>_TRAVEL_MIN`
- `BOT_<ID>_NAME`, `BOT_<ID>_SCOPES`
- `STORE_FILE` (Docker)
- `WEATHER_LAT`, `WEATHER_LON`, `WEATHER_DISPLAY_NAME`
- `TIMEZONE`, `TEMPERATURE_UNIT`, `TIME_FORMAT`, `WEEK_START_DAY`
- `IDLE_TIMEOUT_MS`, `CACHE_REVALIDATE_SECONDS`

`isDemoMode === true` when no `CAL_*_URL` values are set.

## What Exists Today (2026-10-27, `master` at `7acdc2c`)

- **Server platform, kept**: PIN-gate, unlock/lock, rate limit, calendar
  engine, weather engine, caches, health, demo data, Docker. Specified in
  `00-platform-baseline.md`.
- **Tabbed wall prototype** at `/wall` and `/wall/list` (PR #11): all six
  tabs, the bot panel, and the phone page. Calendar and weather are real.
  Lists, to-dos, meals, notes, and photos are sample data in browser
  `localStorage`, and the phone page only syncs inside one browser.
- **iPad-era wall** at `/` (Phases 1–9.1): header, filter chips, month,
  week, and day views. Retired by Phase 10. Its calendar views are reused
  inside the Calendar tab.
- **Gates** in CI: lint, typecheck, unit tests, build, secret scan, and
  Playwright at 1180×820, 1366×1024, and 1920×1080. Phase 10 moves them to
  the v2.0.0 gates.

The iPad-era specs and task lists (Phases 1–9.1) were removed from `.spec/`
on 2026-10-27. They remain in git history at `7acdc2c`.

## Phase Plan

Each phase is one spec, one task list, one chat, and one PR, per
`AGENTS.md`. Implementation starts only on an explicit "implement Phase N".

| Phase | Intent | Spec | Waits on | Status |
|-------|--------|------|----------|--------|
| 00 | Platform baseline carried forward (auth, engines, caches, health, Docker) | `00-platform-baseline.md` | — | Implemented (Phases 1–9.1) |
| 10 | Frame-ready shell: tabbed wall at `/`, Today and Calendar on real data, WebView 124 floor, v2.0.0 gates | `10-frame-shell.md` | Constitution v2.0.0 approval | Spec drafted |
| 11 | Saved data store, wall data API, bot keys, bot HTTPS API and MCP, notes on Today | `11-saved-data-and-bots.md` | Phase 10 | Spec drafted |
| 12 | Shopping and To-dos on the wall, the phone page, and bots | `12-shopping-todos-phone.md` | Phase 11 | Spec drafted |
| 13 | Meals tab and bot meal plans | `13-meals.md` | Phase 11 | Spec drafted |
| 14 | Photos from a private Drive folder | `14-photos.md` | Phase 10; a service account and folder from Dan | Spec drafted |
| 15 | Kiosk app, frame setup, on-device acceptance | `15-kiosk-and-device.md` | Phase 10; the frame with ADB on | Spec drafted |

Phases 12 and 13 can run in either order. Phase 15 can start as soon as
Phase 10 is live, and its device gate then applies to every later phase.

Out of scope for now (ideas, not phases): night dimming, a dark theme,
kitchen timers with sound, a recipe library, chores, per-person location or
ETA, Home Assistant status, and writing calendar events from the wall.

## Related Spec Kit Artifacts

| Artifact | Path |
|----------|------|
| Constitution (review copy) | `.spec/constitution.md` |
| Constitution (Spec Kit canonical) | `.specify/memory/constitution.md` |
| This context | `.spec/project.md` |
| Platform baseline | `.spec/specifications/00-platform-baseline.md` |
| Phase 10 spec / tasks | `.spec/specifications/10-frame-shell.md` / `.spec/tasks/10-frame-shell-tasks.md` |
| Phase 11 spec / tasks | `.spec/specifications/11-saved-data-and-bots.md` / `.spec/tasks/11-saved-data-and-bots-tasks.md` |
| Phase 12 spec / tasks | `.spec/specifications/12-shopping-todos-phone.md` / `.spec/tasks/12-shopping-todos-phone-tasks.md` |
| Phase 13 spec / tasks | `.spec/specifications/13-meals.md` / `.spec/tasks/13-meals-tasks.md` |
| Phase 14 spec / tasks | `.spec/specifications/14-photos.md` / `.spec/tasks/14-photos-tasks.md` |
| Phase 15 spec / tasks | `.spec/specifications/15-kiosk-and-device.md` / `.spec/tasks/15-kiosk-and-device-tasks.md` |
