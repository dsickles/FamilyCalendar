# Specification: Core Scaffolding, PWA Shell & PIN-Gate Security

**Feature ID**: `01-core-and-security`
**Created**: 2026-09-21
**Status**: Phase 1 / 1.5 human review complete 2026-09-21; rate-limit leftover reviewed and tested 2026-09-21 — do not start Phase 2 in this thread
**Input**: Implementation Master Plan, Phase 1 and Phase 1.5
**Constitution check**: Principles I (viewport), II (privacy / explicit relock), III (appliance runtime; idle never PIN-locks)
**Project context**: `.spec/project.md`

This specification covers only the bootable PWA shell, environment-driven
config, type contracts, PIN-gate, explicit relock, demo-mode fallback,
health probe, and Docker packaging. Calendar engine, weather engine, and
dashboard widgets are out of scope.

## User Scenarios & Testing

### User Story 1 — Fresh clone boots in demo mode (Priority: P1)

A portfolio visitor or new developer clones the public repo, copies nothing
into `.env.local`, and runs the dev server. The dashboard loads immediately
with no PIN prompt. Sample calendars ("Alex", "Jordan", "Family", "School")
are available as data (generator exists even if the UI does not yet render
them). No family secrets exist in the tree.

**Why this priority**: Public GitHub + portfolio is a stated product
constraint. If a clone is a brick, the repo is not portfolio-safe.

**Independent Test**: Delete or omit `.env.local`. Start the app. `GET /`
returns 200 without a redirect to `/unlock`. `GET /api/health` reports
`mode: "demo"`.

**Acceptance Scenarios**:

1. **Given** no `CAL_*_URL` values and no `DASHBOARD_PIN`, **When** a user
   visits `/`, **Then** middleware skips auth and the shell renders.
2. **Given** the same environment, **When** `generateDemoEvents()` runs,
   **Then** it returns ~25–30 `UnifiedEvent` objects relative to today,
   stable within a calendar day (deterministic seed).
3. **Given** a public clone, **When** the repo is searched for ICS URLs or
   PINs, **Then** none exist except empty placeholders in `.env.example`.

---

### User Story 2 — Live kiosk is PIN-gated (Priority: P1)

An operator sets `DASHBOARD_PIN` and at least one `CAL_*_URL`. The iPad
(or any browser) cannot see the dashboard or data APIs until the correct
PIN is entered on a touch PIN pad. A valid session lasts 30 days via an
httpOnly cookie.

**Why this priority**: Live family data on a public URL (Vercel) or a LAN
IP (NAS) is the core privacy threat.

**Independent Test**: Set `DASHBOARD_PIN=1234` and a dummy `CAL_PERSONAL_URL`.
Unauthenticated `GET /` redirects to `/unlock`. Correct PIN sets
`dash_session` and allows `/`. Wrong PIN five times rate-limits.

**Acceptance Scenarios**:

1. **Given** a configured PIN and at least one calendar URL, **When** a
   client with no `dash_session` cookie requests `/` or `/api/calendar` or
   `/api/weather`, **Then** middleware redirects to `/unlock` (document
   requests) or denies the API (no private payload).
2. **Given** the unlock page, **When** the user submits the correct PIN,
   **Then** the server sets `dash_session` (`httpOnly`, `sameSite=strict`,
   `path=/`, 30-day maxAge, `secure` in production) and redirects to `/`.
3. **Given** five failed attempts from one IP within 15 minutes, **When**
   a sixth attempt is made, **Then** the API returns 401 (or 429) and does
   not set a cookie, even if the sixth PIN is correct until the window
   resets.
4. **Given** a valid cookie, **When** the user requests `/`, **Then**
   middleware allows the request through.

---

### User Story 5 — Operator explicitly relocks the kiosk (Priority: P2)

An operator who already unlocked this browser wants to require the PIN
again on **this device** without waiting 30 days or wiping site data.
They use a fat-finger-safe lock control. Idle time MUST NOT do this.

**Why this priority**: LAN visitors and a second browser stay gated by
the existing PIN. Relock is the operator's way to drop the iPad (or a
laptop session) back to the pad after guests, maintenance, or handing
the device off. It is not the ambient 24/7 loop.

**Independent Test**: Unlock with the PIN. Confirm-lock. Cookie is
cleared. Next `GET /` redirects to `/unlock`. Wait past idle timeout
without locking; session remains valid.

**Acceptance Scenarios**:

1. **Given** a valid `dash_session`, **When** the operator taps the lock
   control and confirms, **Then** the client `POST`s `/api/auth/lock`,
   the server expires `dash_session` (`Max-Age=0`, same flags as unlock),
   and the UI lands on `/unlock`.
2. **Given** the lock icon is tapped but Cancel is chosen (or the overlay
   is dismissed), **Then** the session cookie is unchanged and the
   dashboard stays visible.
3. **Given** demo mode, **When** `/` renders, **Then** the lock control
   is not shown. `POST /api/auth/lock` in demo mode is a no-op (2xx,
   no redirect required).
4. **Given** an unlocked live session sitting idle past
   `IDLE_TIMEOUT_MS`, **When** no lock control was used, **Then** the
   session cookie is still valid (Phase 8 may return the calendar to
   month view; it MUST NOT call lock).
5. **Given** device A is relocked, **When** device B still has a valid
   cookie, **Then** device B remains unlocked. Relock is per-browser
   cookie, not a global NAS interlock.

---

### User Story 3 — iPad kiosk shell is installable (Priority: P2)

The operator opens the app in Safari on iPad Air 2020 landscape, adds it
to the Home Screen, and launches standalone. The viewport is locked,
chrome is gone, and the page cannot overscroll.

**Why this priority**: Without a correct PWA shell, Guided Access is a
browser tab, not an appliance.

**Independent Test**: Inspect `manifest` and root meta tags. At 1180×820,
the blank shell has no document scrollbars and no rubber-band bounce.

**Acceptance Scenarios**:

1. **Given** the running app, **When** the Next.js manifest route is fetched,
   **Then** it matches the PWA contract below (name, standalone, landscape,
   icons, theme colors).
2. **Given** `app/layout.tsx` metadata, **When** the document head is
   inspected, **Then** Apple web-app capable, black-translucent status bar,
   non-scalable viewport, and `viewportFit: "cover"` are present.
3. **Given** kiosk CSS resets, **When** the page is loaded at 1180×820,
   **Then** `html`/`body` are fixed, overflow hidden, overscroll none,
   pinch-zoom disabled, and text selection disabled.

---

### User Story 4 — Appliance can be health-checked and containerized (Priority: P2)

NAS Container Station (or Docker Compose) can build, run, restart, and
probe the app without baking secrets into the image.

**Why this priority**: Primary deployment path is Docker on the NAS.

**Independent Test**: Files `Dockerfile` and `docker-compose.yml` exist and
match the Master Plan. `GET /api/health` returns 200 with no auth.

**Acceptance Scenarios**:

1. **Given** the health route, **When** `GET /api/health` is called with
   or without a session, **Then** the response is 200 JSON
   `{ status: "ok", mode: "live" | "demo", timestamp: ... }`.
2. **Given** compose, **When** the stack is defined, **Then** it maps
   `3000:3000`, uses `env_file: .env.local`, `restart: unless-stopped`,
   and healthchecks `http://localhost:3000/api/health` every 60s.

---

### Edge Cases

- Demo mode vs PIN: if `CAL_*_URL` values exist, auth MUST run even if
  `DASHBOARD_PIN` is empty — fail closed (treat as locked; unlock cannot
  succeed until PIN is configured). If no calendar URLs exist, skip auth
  regardless of PIN so clones stay usable.
- Middleware MUST skip `/unlock`, `/api/auth/unlock`, `/api/health`,
  `/_next/`, `/icons/`, and the manifest route so the unlock page and
  PWA assets can load.
- Rate limiter is in-memory and resets on process restart (acceptable for
  single-node NAS; documented limitation on multi-instance Vercel).
- Cookie `secure` is true in production and false on LAN HTTP so the
  NAS kiosk can authenticate without TLS.
- `.env.example` is committed; `.env.local` is never committed.
- Unlock UI MUST NOT hint at the PIN length beyond accepting 4–8 digits,
  and MUST NOT echo the PIN in the URL or logs.
- `/api/auth/lock` is **not** on the middleware skip list. An already-locked
  client that POSTs lock is redirected to `/unlock` like any other
  protected route; that is harmless.
- Relock clears only the calling browser's `dash_session`. It MUST NOT
  revoke other devices' cookies (in-memory cookie auth has no server-side
  session store in v1).
- Idle timeout MUST NEVER expire the session or navigate to `/unlock`.

## Requirements

### Functional Requirements — PIN-Gate Architecture

- **FR-001**: Middleware MUST inspect the `dash_session` httpOnly cookie on
  every request except the skip list.
- **FR-002**: Missing or invalid cookie MUST redirect to `/unlock` for
  page routes. Protected API routes MUST NOT return calendar or weather
  payloads without a valid cookie.
- **FR-003**: `POST /api/auth/unlock` MUST accept JSON `{ pin: string }`,
  compare against `DASHBOARD_PIN` using a server-side hash comparison
  (never a client-side check), and on success set `dash_session`.
- **FR-004**: Session token helpers in `lib/auth.ts` MUST provide
  `hashPin`, `verifyPin`, `createSessionCookie`, `verifySessionCookie`,
  and `clearSessionCookie` (expired `dash_session` cookie using the same
  `httpOnly` / `sameSite` / `secure` / `path` flags as create).
  Cookie token hashing uses SHA-256 as specified in Phase 1.5.1.
- **FR-005**: Rate limiter MUST track `{ count, resetAt }` per client IP
  in a `Map`, capping 5 failures per 15 minutes. Counter resets on
  process restart.
- **FR-006**: Unlock page MUST present a 3×4 touch PIN pad (digits 0–9,
  backspace, submit), dark aesthetic matching the dashboard, Framer
  Motion entrance, error shake on failure, app name/logo at top, no PIN
  hints. Digit buttons MUST be ≥ 44×44pt.
- **FR-007**: In demo mode (`isDemoMode() === true`), middleware MUST
  allow all requests through without a cookie.
- **FR-008**: `lib/demo-data.ts` MUST export `generateDemoEvents(): UnifiedEvent[]`
  producing ~25–30 events across calendars labeled "Alex", "Jordan",
  "Family", and "School", dates relative to `new Date()`, deterministic
  within a day.
- **FR-021**: `POST /api/auth/lock` MUST call `clearSessionCookie()`,
  return 200, and MUST sit behind the PIN-gate (not on the skip list).
  In demo mode the handler MUST no-op with 200 and MUST NOT redirect.
  Relock MUST NOT maintain a server-side revocation list; it only expires
  the caller's cookie.
- **FR-022**: Live mode (not demo) MUST render a lock control on the
  dashboard shell (`components/layout/LockControl.tsx`, mounted from
  `app/page.tsx` in Phase 1.5 and kept when DashboardShell arrives):
  Lucide `Lock` icon, `text-white/25` (or equivalent muted style),
  minimum **44×44pt** hit target, bottom-left of the viewport, away from
  future header clock/weather. Tap MUST open a confirm overlay
  ("Lock dashboard? PIN will be required.") with **Cancel** as the
  default/larger action and **Lock** as the confirming action. Confirm
  MUST `POST /api/auth/lock` then navigate to `/unlock`. A tap without
  confirm MUST NOT lock. The control MUST be hidden in demo mode.
  Idle timers MUST NEVER invoke this endpoint.

### Functional Requirements — PWA & Kiosk Shell

- **FR-009**: `app/manifest.ts` MUST return the manifest contract below.
- **FR-010**: Root layout metadata MUST include title "Family Wall
  Dashboard", Apple web-app capable, `statusBarStyle: "black-translucent"`,
  and the non-scalable cover viewport. Explicit Apple and mobile-web-app
  meta tags MUST also be in `<head>` for iOS compatibility.
- **FR-011**: `globals.css` MUST import Tailwind v4 (`@import "tailwindcss"`)
  and apply the kiosk resets from the Master Plan §3.3.
- **FR-012**: Icons MUST exist at `public/icons/icon-192x192.png` and
  `public/icons/icon-512x512.png` (simple calendar glyph).
- **FR-013**: `next.config.ts` MUST set `output: "standalone"`.

### Functional Requirements — Config, Types, Env

- **FR-014**: `lib/config.ts` MUST export `getCalendarSources()`,
  `getDashboardConfig()`, and `isDemoMode()`. `icsUrl` is server-only.
- **FR-015**: Type files MUST implement the data contracts in this spec
  verbatim: `CalendarSource`, `DashboardConfig`, `RawIcsEvent`,
  `UnifiedEvent`, `WeatherData`, `CalendarViewMode`, `CalendarViewState`.
- **FR-016**: `.env.example` MUST document every variable from Master
  Plan §1A with comments and empty secrets.
- **FR-017**: `.gitignore` MUST exclude `.env.local`, `.env.*.local`,
  `.next/`, `out/`, `node_modules/`, `.DS_Store`, `*.swp`, `.vscode/`,
  `.idea/`.
- **FR-018**: `GET /api/health` MUST be unauthenticated and return
  `{ status: "ok", mode: "live" | "demo", timestamp: string }`.
- **FR-019**: `Dockerfile` and `docker-compose.yml` MUST match Master
  Plan §1C (multi-stage Node 20 Alpine, compose env_file, restart,
  healthcheck).
- **FR-020**: Visiting `/` in a booting scaffold MUST show a blank dark
  page (`#0a0a0f`) with correct meta tags; no calendar widgets yet.
  In live mode the lock control from FR-022 is the only interactive
  chrome on that blank shell.

### Key Entities / Data Contracts

Contracts are implementation-binding for Phase 1. They MUST match Master
Plan §1D.2.

#### CalendarSource

```typescript
export interface CalendarSource {
  id: string;
  label: string;
  icsUrl: string; // server-side only; never sent to the client
  color: string;
  icon?: string;
  enabled: boolean;
  category: "person" | "shared" | "utility" | "external";
}
```

#### DashboardConfig

```typescript
export interface DashboardConfig {
  location: {
    latitude: number;
    longitude: number;
    displayName: string;
  };
  timezone: string;
  locale: string;
  temperatureUnit: "fahrenheit" | "celsius";
  timeFormat: "12h" | "24h";
  weekStartDay: 0 | 1;
  idleTimeoutMs: number;
  cacheRevalidateSeconds: number;
  isDemoMode: boolean;
}
```

Defaults when env is unset: lat `40.9892`, lon `-73.7944`, displayName
`"Scarsdale, NY"`, timezone `America/New_York`, locale `en-US`,
temperature `fahrenheit`, timeFormat `12h`, weekStartDay `0`,
idleTimeoutMs `90000`, cacheRevalidateSeconds `600`. `isDemoMode` is
true iff no `CAL_*_URL` values are set.

#### RawIcsEvent

```typescript
export interface RawIcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  rrule?: unknown;
  exdate?: Record<string, Date>;
  recurrenceId?: Date;
  isAllDay: boolean;
  tzid?: string;
}
```

#### UnifiedEvent

```typescript
export interface UnifiedEvent {
  id: string; // `${calendarId}::${uid}::${occurrenceDate.toISOString()}`
  calendarId: string;
  calendarLabel: string;
  calendarColor: string;
  calendarCategory: CalendarSource["category"];
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO 8601, dashboard timezone
  endTime: string;
  isAllDay: boolean;
  isRecurring: boolean;
  originalUid: string;
}
```

`icsUrl` MUST NOT appear on `UnifiedEvent` or any client-consumed DTO.

#### WeatherData

```typescript
export interface WeatherData {
  current: {
    temperature: number;
    apparentTemperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity: number;
    isDay: boolean;
  };
  daily: Array<{
    date: string; // "YYYY-MM-DD"
    temperatureMax: number;
    temperatureMin: number;
    weatherCode: number;
    precipitationProbability: number;
  }>;
  fetchedAt: string;
}
```

#### CalendarViewState

```typescript
export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarViewState {
  mode: CalendarViewMode;
  anchorDate: string; // "YYYY-MM-DD"
  selectedWeekStart?: string;
  selectedDay?: string;
  activeFilters: string[];
  lastInteractionAt: number;
}
```

### PWA Manifest Contract

`app/manifest.ts` MUST return:

| Field | Value |
|-------|-------|
| `name` | Family Wall Dashboard |
| `short_name` | Dashboard |
| `description` | Smart family calendar wall display |
| `start_url` | `/` |
| `display` | `standalone` |
| `orientation` | `landscape` |
| `background_color` | `#0a0a0f` |
| `theme_color` | `#0a0a0f` |
| icons | `/icons/icon-192x192.png` (192×192), `/icons/icon-512x512.png` (512×512, purpose `any maskable`) |

### PIN-Gate Sequence

```text
User → Middleware (dash_session?)
  no  → /unlock → POST /api/auth/unlock { pin }
          hash(pin) vs hash(DASHBOARD_PIN)
          ok  → Set-Cookie dash_session (30d) → redirect /
          bad → 401 + rate limit (5 / 15 min / IP)
  yes → allow /
          optional: LockControl confirm → POST /api/auth/lock
            → expire dash_session (Max-Age=0) → /unlock
```

Skip list: `/unlock`, `/api/auth/unlock`, `/api/health`, `/_next/`,
`/icons/`, manifest route. `/api/auth/lock` is protected, not skipped.

### Environment Variable Contract

See Master Plan §1A `.env.example`. Required pattern for calendars:

`CAL_<ID>_URL`, `CAL_<ID>_LABEL`, `CAL_<ID>_COLOR`, `CAL_<ID>_CATEGORY`

where `<ID>` is an alphanumeric slug and `CATEGORY` is
`person | shared | utility | external`.

## Success Criteria

- **SC-001**: A clone with no `.env.local` reaches a dark full-viewport
  shell in one `npm run dev` without a PIN prompt (demo mode).
- **SC-002**: With `DASHBOARD_PIN` and at least one `CAL_*_URL` set,
  unauthenticated visitors cannot see dashboard HTML or calendar/weather
  API data; authenticated visitors with a valid cookie can.
- **SC-003**: Five wrong PIN submissions from one IP within 15 minutes
  lock out further attempts until the window resets.
- **SC-004**: At 1180×820 landscape, the shell has no document scrollbar,
  no overscroll bounce, and no pinch-zoom.
- **SC-005**: `GET /api/health` returns 200 in both demo and live modes
  without a session cookie.
- **SC-006**: Client JavaScript (sources that ship to the browser) contains
  no PIN, no ICS URLs, and no `DASHBOARD_PIN` string from env.
- **SC-007**: `.env.example` exists in git; `.env.local` does not.
- **SC-008**: After a confirmed lock, this browser requires the PIN
  again; Cancel and idle time do not.
- **SC-009**: Demo mode shows no lock control and never forces `/unlock`.

## Assumptions

- Next.js App Router on Next 15 is the only web framework.
- Tailwind v4 CSS-first (`@import "tailwindcss"`) is used; no v3
  `tailwind.config.js` requirement.
- NAS Docker is a single Node process, so in-memory rate limits are
  acceptable. Multi-region Vercel rate limiting is best-effort.
- Health check uses `curl` inside the Alpine runner; if curl is absent
  from the image, implementation MUST add it or switch the probe to a
  Node-native fetch.
- Phase 2+ (calendar engine, weather, widgets) is specified later.
  Types for those systems are created now so later phases do not
  rewrite contracts.
- PIN hashing in Phase 1.5.1 is SHA-256 for the session token as written
  in the Master Plan task table. The architecture narrative's "bcrypt"
  language is treated as "server-side hashed comparison, never plaintext
  in the client." Middleware MUST validate only the signed/hashed
  session cookie, never the raw PIN.

## Out of Scope (this specification)

- Fetching or parsing real `.ics` feeds
- Open-Meteo live fetch
- Clock, weather, filter, and calendar view components
- Idle timer behavior (constant exists on config; hook is Phase 8).
  Phase 8 MUST restore month view only and MUST NOT call `/api/auth/lock`
- Global session revocation across devices (v1 cookies are independent)
- Auto-lock / idle PIN lock
- README prose beyond `.env.example` comments
- Real family ICS URLs (operator-supplied later via env)

## Human review (2026-09-21)

Phase 1 / 1.5 review is **complete**. Do not implement Phase 2 from this spec.

**Leftover (rate-limit UI vs refresh): reviewed and tested 2026-09-21.** After 5 failed PINs the server rate-limits for 15 minutes, including a later **correct** PIN. `/unlock` re-checks lockout on load (`GET /api/auth/unlock` → `resetAt`) and keeps the keypad locked with the wait message until the window expires. Refresh no longer restores a live pad.

## Constitution Traceability

| Invariant | How this spec honors it |
|-----------|-------------------------|
| I Viewport | Kiosk CSS, 1180×820 verification, PWA landscape, no overscroll |
| II Privacy | PIN-gate, explicit relock, env-only secrets, demo mode, no ICS in client types |
| III Appliance | Health route, Docker restart + standalone output; idle never PIN-locks |
