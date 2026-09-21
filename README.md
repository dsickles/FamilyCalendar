# Family Wall Dashboard

An **ad-free and zero-subscription family kiosk**: a modular, touch-first, full-screen PWA that a household can glance at from about three feet. Think Cozi or DAKboard, without a monthly bill.

This is a wall appliance, not a general website and not a SaaS product. A public clone boots **demo mode** with sample events. A live install (Docker on a home NAS, or optionally Vercel) loads private ICS calendars and local weather **behind the same PIN-gate**. After unlock, the wall is view-only until someone explicitly locks it.

**Status:** Core shell, PWA, PIN-gate, demo data, health check, and Docker packaging are in place. Calendar engine, weather engine, and the ambient month/week/day UI are still ahead.

## Why it exists

| Intent | Meaning |
|--------|---------|
| Wall appliance | Always-on landscape kiosk (iPad + Guided Access) |
| Family overlay | Multiple calendars: people, shared, utilities, holidays |
| Touch-first | 44×44pt targets, no hover-only UI |
| Zero subscription | Self-hosted; Open-Meteo weather; ICS feeds you already have |
| Portfolio-safe | Public repo + demo data; live family data never in git or client JS |

Primary hardware is an **iPad Air (4th gen, 2020)** in landscape (**1180×820**), mounted at arm’s length. It also has to scale to 13″ iPad Pro and a 1920×1080 desktop browser without overflowing.

## What you get today vs later

**Shipped (Phase 1 / 1.5)**

- Next.js App Router PWA shell (standalone, landscape)
- Demo mode when no calendar URLs are configured
- PIN unlock, httpOnly session cookie, rate-limited failures, explicit relock
- `/api/health` for Docker
- Multi-stage `Dockerfile` + Compose

**Not shipped yet**

- ICS fetch/parse/RRULE engine and month/week/day views
- Weather widgets
- Filter chips and idle return-to-month (calendar view reset, not a PIN lock)

Design and constraints live under [`.spec/`](.spec/).

## Quick start (demo)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no `.env.local` (or no `CAL_*_URL` values), the app skips the PIN pad and uses built-in sample calendars.

```bash
npm run build
npm start
```

`GET /api/health` should report demo mode when feeds are unset.

## Live kiosk (private)

Copy [`.env.example`](.env.example) to `.env.local`. Set a 4–8 digit `DASHBOARD_PIN` and at least one `CAL_<ID>_URL`. Those values stay server-side only; they must never land in git or client bundles.

Then either:

1. **Primary — Docker on a QNAP (or any Docker host)** on the home LAN, port 3000, no public port-forward. iPad on the same network → unlock once → Add to Home Screen → Guided Access.
2. **Optional — Vercel** with the same env vars. The app PIN-gate is mandatory; Vercel Deployment Protection is an extra layer, not a replacement.

Idle time resets the calendar **view** to the month grid (once that UI exists). It does **not** bring back the PIN. PIN is required again after explicit lock or when the 30-day session cookie expires.

## Stack

Next.js (App Router, standalone output), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide, `node-ical`, SWR, Open-Meteo (no API key).

## Spec Kit

This repo is specified before it is coded. Canonical docs:

| Doc | Path |
|-----|------|
| Constitution | [`.spec/constitution.md`](.spec/constitution.md) |
| Project context | [`.spec/project.md`](.spec/project.md) |
| Core + security spec | [`.spec/specifications/01-core-and-security.md`](.spec/specifications/01-core-and-security.md) |

## License

Private family appliance source, published as a public portfolio repo. No live dashboard URL is linked from here on purpose.
