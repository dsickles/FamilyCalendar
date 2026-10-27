# Family Wall Dashboard Constitution

> Canonical Spec Kit copy: `.specify/memory/constitution.md` (v2.0.0).
> This file is the reviewable extract of the same ratification.
>
> **Status**: v1.1.0 approved 2026-09-21. v1.2.0 approved 2026-10-20 via PR #4. v2.0.0 (Anna Bella PF1508 frame replaces the iPad; tabbed wall with saved data, bots, and photos) drafted 2026-10-27, pending owner approval. The phase plan is in `.spec/project.md`.

## Core Principles

### I. Hardware-Bound Viewport (NON-NEGOTIABLE)

The dashboard is a wall-mounted kiosk surface, not a general-purpose website.
The one acceptance device is the **Anna Bella PF1508 15.6" frame**
(Allwinner A333, 2 GB RAM, Android 15, AiMOR OS, firmware
`…A333-1506-D2048-…PF1508…`) in landscape. Its screen is **1920×1080 CSS
pixels at a device pixel ratio of 1** (160 dpi). Every wall screen, overlay,
and animation MUST compose inside that rectangle with **zero overscroll**.

- `html` and `body` MUST use `overflow: hidden`, `overscroll-behavior: none`,
  `position: fixed`, `inset: 0`, `width: 100%`, and `height: 100%` on the
  wall.
- Pull-to-refresh, pinch-zoom, double-tap zoom, momentum scrolling of the
  page, text selection, and long-press callouts MUST be disabled on the wall
  shell.
- Viewport meta MUST set `width=device-width`, `initialScale: 1`,
  `maximumScale: 1`, and `userScalable: false`.
- Layout MUST use `dvh` (not `vh`) for full-height surfaces.
- All interactive controls MUST meet a **44×44 CSS px** minimum hit target.
- Pixel overflow or a page-level scrollbar at 1920×1080 on any wall tab is a
  constitution violation.
- Contained vertical scroll is permitted only inside the named scroll regions
  listed in the wall specification (the Week time grid and the list bodies of
  Shopping, To-dos, and the Meals cooking card). Each MUST use
  `overscroll-behavior: contain`.
- The **phone page** (`/list`) is the one other gated surface: portrait,
  **390×844 CSS px**. It MAY scroll vertically as a document. It MUST NOT
  scroll horizontally, and its controls MUST meet the 44×44 target.
- **Every other viewport is best-effort**: desktop browsers, iPads, and
  landscape phones. The wall MAY scale its 1920×1080 stage down to fit.
  Defects there are bugs to fix, not constitution violations, and MUST NOT
  block a merge. CSS for those viewports MUST NOT change layout at
  1920×1080.

**Rationale**: The frame has no browser chrome, no navigation bar, and no
user escape hatch. Overscroll, zoom, or overflow makes the wall look broken
and can strand the household on a half-drawn screen.

### II. Frame Browser Floor (NON-NEGOTIABLE)

The frame's only browser engine is **Android System WebView
124.0.6367** (Chrome 124). It is the only WebView provider on the frame,
`/system` is read-only, and no app store updates it. Treat it as a permanent
ceiling.

- Everything the wall and the phone page ship to the browser (JavaScript,
  CSS, fonts, images) MUST work on WebView 124 without polyfills fetched at
  runtime.
- A browser feature newer than Chrome 124 MAY be used only behind a feature
  check with a working fallback. Shipping one unguarded is a violation.
- The build's browser targets MUST be pinned so the compiled output never
  needs more than Chrome 124. A dependency upgrade that raises the framework
  or CSS baseline above Chrome 124 is a violation even if the app still
  builds.
- Fonts MUST be bundled with the app (`next/font` or local files). The wall
  MUST NOT depend on a font CDN at runtime.
- **Performance budget on 2 GB RAM**:
  - The wall route's initial client JavaScript MUST stay at or under
    **250 KB gzip**.
  - Full-screen images MUST be served at or under 1920×1080, and at most
    **two** full-screen images may be decoded at once.
  - Wall animation MUST use `transform` and `opacity` only. `backdrop-filter`
    and `filter: blur()` are forbidden on the wall.

**Rationale**: Next.js 16 and Tailwind v4 need Chrome 111. The frame has
Chrome 124 and will never get more. A silent baseline bump in a dependency
would break the wall with no way to fix the device.

### III. Security & Privacy Isolation (NON-NEGOTIABLE)

The repository is public and portfolio-linked. The running appliance holds
private family data: calendars, lists, to-dos, meals, notes, and photos.
Those two facts MUST never mix.

- No secret, PIN, ICS feed URL, session token, bot key, store token, Google
  credential, Drive folder ID, live family event, list item, to-do, meal,
  note, or family photo MAY appear in source, committed config, client
  JavaScript bundles, or documentation examples that ship in the repo.
- All sensitive configuration MUST live in environment variables
  (`.env.local` locally; platform env vars on Vercel; `env_file` on Docker).
  `.env.local` and `.env.*.local` MUST be gitignored. The repo MAY commit
  only a documented `.env.example` with empty or non-secret defaults.
- Live deployments MUST enforce a **PIN-gate** in Next.js middleware (the
  `proxy` convention in Next.js 16): unauthenticated page requests redirect
  to `/unlock`, and unauthenticated API requests get 401. The only routes
  open without a session are `/unlock`, `/api/auth/unlock`, `/api/health`,
  static/PWA assets (`/_next/`, `/icons/`, the manifest, `/favicon.ico`),
  and the **bot routes** below.
- Every data route MUST sit behind the PIN-gate: `/api/calendar`,
  `/api/weather`, the saved-data API, and the photo API. Direct calls
  without a valid session MUST NOT return private data. The phone page
  `/list` is a page route and sits behind the same gate.
- PIN comparison MUST happen server-side only. The session cookie MUST be
  named `dash_session`, and MUST be `httpOnly`, `sameSite: "strict"`,
  `path: "/"`, 30-day maxAge, and `secure` in production. Client JavaScript
  MUST NOT read the PIN or the session cookie.
- Failed unlock attempts MUST be rate-limited to **5 per client IP per 15
  minutes**.
- An unlocked browser MAY drop its own session only through an explicit
  operator action (`POST /api/auth/lock` plus confirm UI). Idle time,
  view-reset, and overnight uptime MUST NOT expire `dash_session` or
  redirect to `/unlock`.
- Calendar feed URLs (`CAL_*_URL`) MUST be read server-side only and MUST
  NEVER be serialized to the client. Client payloads MAY include calendar
  `id`, `label`, `color`, and `category` only.
- **Bots** skip the PIN but MUST present a **per-bot key**
  (`Authorization: Bearer`), configured as `BOT_<ID>_KEY` with
  `BOT_<ID>_SCOPES`. Keys MUST be compared in constant time. Each key MAY
  perform only its listed scopes; anything else gets 403. Bot requests MUST
  be rate-limited per key. Every bot write MUST be recorded in the activity
  log with the bot's name, never its key.
- **Bots send data, never markup.** Bot and phone input MUST be validated
  against a schema with size limits and rendered as text. The wall MUST NOT
  render HTML, scripts, or URLs as active content from saved data.
- **Photos** are private. Photo bytes and the photo list MUST be served only
  through PIN-gated routes with `Cache-Control: private`. Drive credentials
  stay server-side. Photos MUST never be committed.
- **Demo mode** (no `CAL_*_URL` values configured) MUST skip the PIN-gate
  and render built-in sample data so a public clone is useful without
  secrets. Demo mode MUST NOT read or write the live store, MUST NOT read
  Drive, and MUST answer bot writes with 403. Demo mode MUST NOT be active on
  a deployment that has real feeds. Demo mode is decided by the absence of
  `CAL_*_URL` alone; a `DASHBOARD_PIN` with no feeds still serves demo data.

**Rationale**: A leaked ICS URL, bot key, or photo URL is a permanent
privacy incident. Defense in depth (gitignore, env-only secrets, server-side
auth, gated APIs, scoped bot keys) is the product, not an add-on.

### IV. Appliance-Grade Runtime (NON-NEGOTIABLE)

This is a 24/7 family kiosk, not a session-based web app. Process stability,
bounded memory, and predictable recovery are constitution-level requirements.

- **Kiosk shell**: the frame runs the project's Android kiosk app (derived
  from `wesbos/photo-frame-dashboard`'s `dashboard/kiosk`, target SDK 28 or
  newer). It MUST be set as the Home app, lock landscape, keep the screen
  on, persist cookies, load the live wall URL at boot, and recover by
  itself: a crashed or killed WebView renderer MUST be recreated and the
  wall reloaded within **10 seconds**, and a failed load MUST retry until
  the network returns. Vendor apps that take over the screen (the Frameo or
  AiMOR slideshow) MUST be disabled.
- Docker deployments MUST use `restart: unless-stopped`, Next.js
  `output: "standalone"`, and a `/api/health` endpoint polled at least every
  60 seconds (timeout 5s, 3 retries). `/api/health` MUST remain
  unauthenticated.
- In-memory caches MUST have explicit TTLs (calendar default 600s; weather
  default 1800s; photo list default 1800s) and MUST be safe to drop on
  process restart. Caches MUST NOT grow without bound; keys MUST be derived
  from source identity plus date window, not from unbounded request
  variance.
- **The durable store** holds lists, to-dos, meals, notes, and the activity
  log, and nothing else. It MUST be capped: at most **200** shopping items
  (ticked items cleared after 24 hours), **300** open to-dos (done to-dos
  cleared after 30 days), meals from **14 days back to 14 days ahead**,
  notes that expire within **7 days**, and the last **200** activity
  entries. A write that would pass a cap MUST be refused with a clear error,
  not silently dropped. Store outages MUST NOT blank the wall: show the
  last-known data and mark it stale.
- Client timers, SWR hooks, `requestAnimationFrame` loops, and event
  listeners MUST clean up on unmount. Unbounded `setInterval` for the clock
  is forbidden; clock updates MUST be rAF-driven and re-render only when the
  displayed unit changes. Data polling MUST use bounded intervals and MUST
  NOT stack requests.
- After `IDLE_TIMEOUT_MS` (default 90_000) with no pointer or touch
  activity, any wall tab except Photos MUST return to **Today** and close
  open overlays. The Calendar tab keeps its last view for the next visit.
  Idle recovery MUST NOT crash or leak timers, and MUST NOT clear the
  session cookie or show the PIN pad.
- External fetches (ICS feeds, Open-Meteo, Drive) MUST use per-request
  timeouts (8 seconds) and `Promise.allSettled` across sources so one dead
  source cannot stall the appliance. Partial results plus last-known cache
  (even if stale) MUST be preferred over a blank wall.
- The process and the WebView MUST remain usable overnight: no unbounded
  console logging of event, list, or photo payloads, no client-side secret
  material, no accumulating DOM from unreaped animations or slides.

**Rationale**: Nobody at home can "refresh" a wall frame with no navigation
bar. Memory leaks, hung fetches, or a crashed renderer mean a dead display
until someone plugs in a laptop.

## Deployment Constraints

The primary runtime is a PIN-protected **Vercel** deployment, so the phone
page and bots can reach it from outside the house. Docker on a NAS is a
supported LAN-only runtime. A separate public demo deployment is also
permitted. All paths MUST obey the same constitution.

- The **live** Vercel deployment MUST set `DASHBOARD_PIN`, `CAL_*`, the
  store credentials, the Drive credentials, and `BOT_*` as platform
  environment variables. The PIN-gate is the application control. Vercel
  Deployment Protection MAY be enabled as a second layer only if the frame,
  the phone page, and bots can still reach the app; it MUST NOT replace the
  PIN-gate.
- The frame MUST load the live deployment over HTTPS.
- A **Docker** deployment MUST NOT require public port forwarding. Its store
  is a file on a mounted volume. Bots and the phone page reach it on the
  home network only.
- A **public demo** deployment (currently `familycalendar-demo.vercel.app`)
  MAY run with no `CAL_*_URL` and no `DASHBOARD_PIN`, and therefore serves
  only built-in sample data in demo mode. It MUST be a separate Vercel
  project from any live deployment, with its own environment variables, and
  MUST NEVER share a deployment, project, domain, store, or environment with
  the live install. Adding any `CAL_*_URL`, store credential, Drive
  credential, or `BOT_*` key to the demo project is a constitution
  violation.
- Portfolio surfaces MUST link the public GitHub repo and demo screenshots
  or recordings, and MAY link the public demo deployment. They MUST NOT
  deep-link a live private dashboard as if it were a public demo.
- Dockerfile MUST be multi-stage and production-oriented (builder + runner).
  Compose MUST pass `env_file: .env.local` and MUST NOT bake secrets into
  the image.

## Compliance Gates

Every feature spec, plan, and PR MUST pass these checks before merge:

1. **Viewport gate**: At 1920×1080, every wall tab has no document scroll,
   no overscroll, no pixel overflow, and all tap targets ≥ 44×44 CSS px.
   Only the named scroll regions scroll. At 390×844, `/list` has no
   horizontal overflow and all tap targets ≥ 44×44 CSS px.
2. **Frame browser gate**: The gated end-to-end suite passes on Chromium
   124 as well as current Chromium. A scan of the built client output finds
   no unguarded feature newer than Chrome 124. The wall route's initial
   JavaScript is at or under 250 KB gzip.
3. **Bundle gate**: Client bundles contain no PIN, ICS URL,
   `DASHBOARD_PIN`, bot key, store token, Google credential, or
   `.env.local` value. `icsUrl` MUST NOT appear in any client-consumed type.
4. **Auth gate**: With `DASHBOARD_PIN` set, unauthenticated requests to the
   wall, `/list`, `/api/calendar`, `/api/weather`, the saved-data API, and
   the photo API redirect or 401. Bot routes answer 401 without a key and
   403 outside a key's scopes. `/unlock` and `/api/health` remain reachable.
   In demo mode, the PIN is skipped and bot writes are refused.
5. **Uptime gate**: Health endpoint returns 200. Caches expire. Store caps
   hold. Idle returns to Today. No timer or listener leaks in the ambient
   loop or the slideshow.
6. **Secret gate**: `git status` never stages `.env.local`. `.env.example`
   remains documentation-only.
7. **Device gate**: Once the frame runs the kiosk app, every phase that
   changes client code is checked on the PF1508: a cold load shows the wall
   within 10 seconds on home Wi-Fi, a tab switch completes within 1 second,
   and a 24-hour run ends with the wall still drawn and the renderer's
   memory no more than 20% above its first-hour level. A phase merged
   before the frame is set up records this gate as pending.

A change that fails any gate is non-compliant even if the feature works.

## Transition to v2.0.0

v2.0.0 was adopted before the code caught up. The tabbed wall prototype
lives at `/wall` with browser-only sample data, and `/` still serves the
iPad-era calendar wall. Phases 10 through 15 in `.spec/project.md` bring the
code into line. Until a phase lands, the gates it delivers are recorded as
pending in that phase's verification table. New work MUST NOT widen the
gap.

## Governance

This constitution supersedes implementation plans, feature specs, and
ad-hoc convenience. If a task conflicts with an invariant, the invariant
wins and the task MUST be rewritten.

- **Amendments**: Require an explicit written change to this file, a
  semantic version bump, an updated `Last Amended` date, and a short
  rationale. Silent drift in code is not an amendment.
- **Versioning**: MAJOR — removal or incompatible redefinition of an
  invariant. MINOR — new invariant or materially expanded guidance.
  PATCH — clarification or typo fix with no rule change.
- **Review**: Spec Kit plan and task generation MUST include a Constitution
  Check against principles I–IV and the Deployment Constraints. Implementation
  MUST NOT proceed past a failed gate.
- **Scope of this ratification**: Hardware/viewport, frame browser floor,
  security/privacy, and appliance runtime only. Visual design, calendar
  RRULE strategy, and tab-level UX are specified elsewhere and MUST still
  honor these invariants.

**Version**: 2.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-10-27
