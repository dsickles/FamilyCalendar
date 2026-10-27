# Tasks: Kiosk App, Frame Setup, and On-Device Acceptance

**Input**: `.spec/specifications/15-kiosk-and-device.md`
**Constitution**: `.spec/constitution.md` (v2.0.0)
**Project context**: `.spec/project.md`
**Status**: Not started. Starts only on "implement Phase 15", after Phase 10 is live and the frame has ADB on.

## Format

`- [ ] Tnnn [P?] [US?] Step 15.N — description (files)`

Task IDs continue from Phase 14 (`T115`).

Some steps happen on Dan's frame with his computer. Those are marked
**(on the frame)**; the session writes the commands and Dan runs them.

---

## Phase 15: Kiosk App and Device Acceptance

**Goal**: Power on to the wall with no touch, recover from crashes, and
make the device gate a repeatable script.

- [ ] T116 [US2] Step 15.1 — `kiosk/`: README with the pinned upstream
      commit, a build script that fetches it and applies the crash-recovery
      patch, and the patch itself (`onRenderProcessGone` recreates the
      WebView and reloads) (FR-001 to FR-004). Open the patch upstream as
      a pull request.
- [ ] T117 [US1] Step 15.2 — **(on the frame)** Confirm firmware, disable
      vendor apps, install the APK, save the live URL, set Home, wait 30
      seconds, reboot, unlock with the PIN once (FR-005, FR-006).
- [ ] T118 [US3] Step 15.3 — `scripts/device-check.sh`: device facts,
      cold-load time, tab-switch times, `--soak` memory sampling, pass or
      fail table (FR-007, FR-008).
- [ ] T119 [US2] Step 15.4 — **(on the frame)** Kill the renderer three
      times; record recovery times.
- [ ] T120 [US3] Step 15.5 — **(on the frame)** Run the device check and a
      24-hour soak; record the output in this file and mark the device gate
      for Phases 10 to the latest merged phase.

### Phase 15 Verification

| Check | Evidence |
|-------|----------|
| Boot | Power cycle to Today with no touch, time recorded |
| Crash recovery | Three renderer kills, each back within 10 seconds |
| Device gate | Cold load ≤ 10 s, tab switch ≤ 1 s, 24-hour soak memory ≤ +20%, wall always drawn |
| Facts | Firmware, WebView 124.0.6367.219, 1920×1080, density 160 match `.spec/project.md` |

**Stop after this gate.**
