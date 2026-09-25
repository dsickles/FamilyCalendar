# Family Wall Dashboard Constitution

> Canonical Spec Kit copy: `.specify/memory/constitution.md` (v1.1.0).
> This file is the reviewable extract of the same ratification.
>
> **Status**: Approved 2026-09-21. Invariants unchanged (v1.1.0). Implementation progress through Phase 9 is in `.spec/project.md`.

## Core Principles

### I. Hardware-Bound Viewport (NON-NEGOTIABLE)

The dashboard is a wall-mounted kiosk surface, not a general-purpose website.
Primary design and acceptance target is **iPad Air (2020) in landscape**, with a
strict CSS layout bound of **1180×820 CSS pixels**. Every screen, overlay, and
animation MUST compose inside that rectangle with **zero overscroll**.

- `html` and `body` MUST use `overflow: hidden`, `overscroll-behavior: none`,
  `position: fixed`, `inset: 0`, `width: 100%`, and `height: 100%`.
- Rubber-band bounce, pull-to-refresh, pinch-zoom, momentum scrolling, text
  selection, and long-press callouts MUST be disabled on the shell.
- Viewport meta MUST set `maximumScale: 1`, `userScalable: false`, and
  `viewportFit: "cover"`. PWA manifest `orientation` MUST be `landscape`.
- Layout MUST use `dvh` (not `vh`) and honor `env(safe-area-inset-*)` padding
  for notched or rounded iPad displays.
- All interactive controls MUST meet a **44×44pt** minimum hit target.
- The layout MUST scale cleanly to 13" iPad Pro (1366×1024) and desktop
  (1920×1080) without introducing scrollbars, pixel overflow, or cropped
  chrome. Pixel overflow at any of 1180×820, 1366×1024, or 1920×1080 is a
  constitution violation.
- The default ambient view MUST fill the viewport with no page-level
  scrollbars. Contained vertical scroll is permitted only inside Week view's
  time grid, and MUST use `overscroll-behavior: contain`.

**Rationale**: Guided Access kiosk mode has no browser chrome and no user
escape hatch. Overscroll, zoom, or overflow makes the wall display look
broken and can expose iPad system UI.

### II. Security & Privacy Isolation (NON-NEGOTIABLE)

The repository is public and portfolio-linked. The running appliance displays
private family data. Those two facts MUST never mix.

- No secret, PIN, ICS feed URL, session token, or live family event data MAY
  appear in source, committed config, client JavaScript bundles, or
  documentation examples that ship in the repo.
- All sensitive configuration MUST live in environment variables
  (`.env.local` locally; platform env vars on Vercel; `env_file` on Docker).
  `.env.local` and `.env.*.local` MUST be gitignored. The repo MAY commit
  only a documented `.env.example` with empty or non-secret defaults.
- Live deployments MUST enforce a **PIN-gate** in Next.js middleware:
  unauthenticated requests redirect to `/unlock`. The only unprotected
  application routes are `/unlock`, `/api/auth/unlock`, `/api/health`, and
  static/PWA assets (`/_next/`, `/icons/`, `/manifest.json` / `manifest.webmanifest`).
- `/api/calendar` and `/api/weather` MUST sit behind the same PIN-gate.
  Direct API calls without a valid session MUST NOT return private data.
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
- **Demo mode** (no `CAL_*_URL` values configured) MUST skip the PIN-gate
  and render built-in sample data so a public clone is useful without
  secrets. Demo mode MUST NOT be active on a deployment that has real feeds.

**Rationale**: A leaked ICS URL or PIN in a client bundle is a permanent
privacy incident. Defense in depth (gitignore + env-only secrets +
server-side auth + API gating) is the product, not an add-on.

### III. Appliance-Grade Runtime (NON-NEGOTIABLE)

This is a 24/7 family kiosk, not a session-based web app. Process stability,
bounded memory, and predictable recovery are constitution-level requirements.

- Production runtime MUST be kiosk-stable: PWA `display: "standalone"`,
  landscape lock, Apple web-app capable meta tags, and CSS that prevents
  Safari chrome from appearing or bouncing.
- Docker deployments MUST use `restart: unless-stopped`, Next.js
  `output: "standalone"`, and a `/api/health` endpoint polled at least every
  60 seconds (timeout 5s, 3 retries). `/api/health` MUST remain unauthenticated.
- In-memory caches MUST have explicit TTLs (calendar default 600s; weather
  default 1800s) and MUST be safe to drop on process restart. Caches MUST
  NOT grow without bound; keys MUST be derived from feed identity plus
  date window, not from unbounded request variance.
- Client timers, SWR hooks, `requestAnimationFrame` loops, and event
  listeners MUST clean up on unmount. Unbounded `setInterval` for the clock
  is forbidden; clock updates MUST be rAF-driven and re-render only when
  the displayed unit changes.
- After `IDLE_TIMEOUT_MS` (default 90_000) with no pointer/touch activity
  while not on month view, the UI MUST return to the ambient month view
  with today as the anchor. Idle recovery MUST NOT crash or leak timers.
  Idle recovery MUST NOT clear the session cookie or show the PIN pad.
- Feed fetches MUST use per-feed timeouts (8 seconds) and `Promise.allSettled`
  so one dead feed cannot stall the appliance. Partial results plus last-known
  cache (even if stale) MUST be preferred over a blank wall.
- The process MUST remain usable overnight: no unbounded console logging of
  event payloads, no client-side secret material, no accumulating DOM from
  unreaped animations.

**Rationale**: A wall iPad in Guided Access cannot be "refreshed" by a
casual user. Memory leaks, hung fetches, or a crashed tab mean a dead
display until someone with the Guided Access PIN intervenes.

## Dual-Path Deployment Constraints

Primary runtime is Docker on a NAS (LAN-only kiosk). Optional runtime
is a PIN-protected Vercel deployment. Both paths MUST obey the same
constitution.

- The NAS MUST NOT require public port forwarding. The iPad reaches the NAS
  on the local network only.
- Vercel MUST set `CAL_*` and `DASHBOARD_PIN` as platform environment
  variables. PIN-gate is the application control. Vercel Deployment
  Protection MAY be enabled as a second layer; it MUST NOT replace the
  PIN-gate.
- Portfolio surfaces MUST link the public GitHub repo and demo screenshots
  or recordings. They MUST NOT deep-link a live private dashboard as if it
  were a public demo.
- Dockerfile MUST be multi-stage and production-oriented (builder + runner).
  Compose MUST pass `env_file: .env.local` and MUST NOT bake secrets into
  the image.

## Compliance Gates

Every feature spec, plan, and PR MUST pass these checks before merge:

1. **Viewport gate**: Emulate 1180×820 landscape. Confirm no document
   scroll, no overscroll bounce, no overflow, and all tap targets ≥ 44×44pt.
2. **Bundle gate**: Client bundles contain no PIN, no ICS URLs, no
   `DASHBOARD_PIN`, and no `.env.local` values. `icsUrl` MUST NOT appear in
   any client-consumed type.
3. **Auth gate**: With `DASHBOARD_PIN` set, unauthenticated requests to `/`,
   `/api/calendar`, and `/api/weather` redirect or 401. `/unlock` and
   `/api/health` remain reachable. In demo mode (no `CAL_*_URL`), auth is
   skipped.
4. **Uptime gate**: Health endpoint returns 200. Caches expire. Idle timer
   restores month view. No timer or listener leaks in the ambient loop.
5. **Secret gate**: `git status` never stages `.env.local`. `.env.example`
   remains documentation-only.

A change that fails any gate is non-compliant even if the feature works.

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
  Check against principles I–III and both constraint sections. Implementation
  MUST NOT proceed past a failed gate.
- **Scope of this ratification**: Hardware/viewport, security/privacy, and
  appliance runtime only. Visual design tokens, calendar RRULE strategy,
  and later-phase UX are specified elsewhere and MUST still honor these
  invariants.

**Version**: 1.1.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
