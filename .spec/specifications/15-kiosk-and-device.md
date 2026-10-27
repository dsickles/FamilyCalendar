# Specification: Kiosk App, Frame Setup, and On-Device Acceptance

**Feature ID**: `15-kiosk-and-device`
**Created**: 2026-10-27
**Status**: Draft, pending owner review. Implementation starts only on "implement Phase 15".
**Input**: Photo frame dashboard plan; PF1508 write-up in `wesbos/photo-frame-dashboard`; wall dashboard readiness review (2026-10-26)
**Constitution check**: Principles I (1920×1080 at DPR 1 on the real screen), II (WebView 124 on the real device), IV (kiosk shell, crash recovery, 24-hour run); Compliance gate 7 (device gate)
**Project context**: `.spec/project.md`
**Depends on**: `10-frame-shell.md` live on the Vercel deployment. Needs Dan's PF1508 with ADB turned on and a computer with `adb`.

The frame boots straight into the wall and keeps it on screen through
crashes, Wi-Fi drops, and power cuts. Then the wall is checked on the real
device against the device gate, and that check becomes a repeatable script
for every later phase.

## User Scenarios & Testing

### User Story 1 — Power on, see the wall (Priority: P1)

**Independent Test**: Pull the frame's power, plug it back in. Without a
touch, the wall's Today tab is on screen within 90 seconds.

**Acceptance Scenarios**:

1. **Given** the kiosk app set as Home with the live URL saved, **When** the
   frame boots, **Then** it opens the wall, already unlocked (the WebView
   kept `dash_session`).
2. **Given** Wi-Fi isn't up yet at boot, **When** the first load fails,
   **Then** the kiosk retries until the wall loads.
3. **Given** the frame, **When** it runs, **Then** the screen never sleeps
   and the Frameo and AiMOR apps never take over.

### User Story 2 — The wall recovers from a crash by itself (Priority: P1)

**Independent Test**: With ADB, kill the WebView renderer process
(`adb shell am kill` on the sandboxed renderer, or `chrome://crash` in a
debug build). The wall is back within 10 seconds.

**Acceptance Scenarios**:

1. **Given** the renderer dies or is killed for memory, **When** the
   WebView reports it, **Then** the kiosk destroys that WebView, creates a
   new one, and reloads the saved URL within 10 seconds.
2. **Given** three crashes within 10 minutes, **When** the fourth happens,
   **Then** the kiosk still recovers, and logs the count for the device
   check.

### User Story 3 — The device gate is a script, not a memory (Priority: P1)

**Independent Test**: `scripts/device-check.sh` run against the frame over
USB prints a pass or fail table for each device gate item.

**Acceptance Scenarios**:

1. **Given** the script, **When** it runs, **Then** it records the
   firmware string, WebView version, screen size and density, and kiosk
   app version, and fails if any differ from `.spec/project.md`.
2. **Given** a cold start, **When** the script reloads the wall, **Then** it
   measures time to Today drawn (via the WebView's remote debugging
   protocol over `adb forward`) and fails above 10 seconds.
3. **Given** the six tabs, **When** the script switches through them,
   **Then** each switch completes within 1 second.
4. **Given** `--soak 24h`, **When** it runs, **Then** it samples the
   renderer's memory (`dumpsys meminfo` for the WebView's sandboxed
   process) every 10 minutes and fails if the last hour's average is more
   than 20% above the first hour's, or if the wall is ever not drawn.
5. **Given** the result, **When** a phase finishes, **Then** its
   verification table links the script's output.

### Edge Cases

- An AiMOR update prompt appears: don't accept it until ADB is confirmed
  working and the kiosk is set as Home (a newer build might remove the
  factory test menu).
- The Home setting is lost after a reboot: wait about 30 seconds after
  `set-home-activity` before rebooting, as the PF1508 write-up found.
- The menu button option of the kiosk app is left off: the wall's rail
  uses the bottom-left corner, where that button would sit. Use the
  two-finger hold instead.

## Requirements

### Functional Requirements — Kiosk app

- **FR-001**: Use the upstream kiosk app from
  `wesbos/photo-frame-dashboard` (`dashboard/kiosk`, MIT), pinned to a
  commit recorded in `kiosk/README.md` in this repo. Upstream already
  provides the saved URL (`--es url`), Home mode, keep-screen-on, landscape
  lock, load retry, a captive-portal check, the two-finger menu, and the
  accessibility Back and Dashboard buttons.
- **FR-002**: Add renderer crash recovery: override
  `WebViewClient.onRenderProcessGone`, return `true`, destroy and recreate
  the WebView, and reload the saved URL. Offer the change upstream as a
  pull request; until it is merged, keep it as a patch file in `kiosk/`
  applied by a build script.
- **FR-003**: Build with target SDK 28 or newer (the PF1508 refuses SDK 23
  builds). The APK is built locally or in CI, never committed.
- **FR-004**: `kiosk/README.md` MUST list the exact `adb` commands to
  install, save the live URL, set Home (and wait 30 seconds), enable the
  accessibility service, and undo each step. The live URL is typed on the
  command line, never committed.

### Functional Requirements — Frame setup

- **FR-005**: The setup steps MUST follow the Photo frame dashboard plan:
  confirm the firmware string, turn on ADB through the factory test app,
  disable vendor apps with `pm disable-user` (Frameo, AiMOR slideshow,
  `com.softwinner.runin`), install the kiosk, save the URL, set Home.
- **FR-006**: The wall MUST be unlocked once with the PIN on the frame and
  then never ask again unless someone locks it.

### Functional Requirements — Device check

- **FR-007**: `scripts/device-check.sh` MUST implement User Story 3 with
  `adb` and the WebView DevTools protocol only; no root.
- **FR-008**: The checked-in expected values (firmware, WebView version,
  1920×1080, density 160) MUST match `.spec/project.md`.

## Success Criteria

- **SC-001**: Power cycle to Today in under 90 seconds with no touch.
- **SC-002**: A killed renderer recovers in under 10 seconds.
- **SC-003**: A 24-hour soak passes the memory and drawn checks.
- **SC-004**: The device gate is marked passed for Phase 10 through the
  latest merged phase.

## Out of Scope

- Rooting, a WebView swap, or custom firmware (not needed on the PF1508).
- Remote management of the frame beyond `adb`.

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| FR-001 to FR-004 | IV (kiosk shell, crash recovery) |
| FR-005, FR-006 | III (PIN once, session kept), IV (vendor apps off) |
| FR-007, FR-008 | I, II, IV; Compliance gate 7 |
