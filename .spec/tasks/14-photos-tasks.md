# Tasks: Photos from a Private Drive Folder

**Input**: `.spec/specifications/14-photos.md`
**Constitution**: `.spec/constitution.md` (v2.0.0)
**Project context**: `.spec/project.md`
**Status**: Not started. Starts only on "implement Phase 14", after Phase 10 is merged and Dan has shared a Drive folder with a service account.

## Format

`- [ ] Tnnn [P?] [US?] Step 14.N — description (files)`

Task IDs continue from Phase 13 (`T109`).

---

## Phase 14: Photos

**Goal**: The slideshow and Today tile play the family's private Drive
folder, resized for the frame, with flat memory.

- [ ] T110 [US1] Step 14.1 — Drive client with service account auth,
      paging, 8-second timeout; 1800-second list cache with stale serve
      (FR-001 to FR-003). Add `google-auth-library`. (`lib/photos/drive.ts`,
      `lib/photos/cache.ts`, tests with a mocked client)
- [ ] T111 [US2] Step 14.1 — Opaque HMAC photo IDs; `GET /api/photos`
      (FR-004). (`app/api/photos/route.ts`)
- [ ] T112 [US3] Step 14.2 — `GET /api/photos/[id]`: fetch, `sharp`
      resize to fit 1920×1080, WebP, 100 MB LRU, `Cache-Control: private`
      (FR-005). Add `sharp`. (`app/api/photos/[id]/route.ts`)
- [ ] T113 [US3] Step 14.3 — Slideshow: daily shuffle, "N years ago"
      first, preload one, at most two images, opacity crossfade, element
      removed after fade (FR-006); Today tile on the same list.
      (`components/wall/parts.tsx`, `components/wall/WallApp.tsx`)
- [ ] T114 [P] Step 14.4 — `.env.example`, bundle-gate fake service
      account email (FR-008).
- [ ] T115 [US2] Step 14.5 — e2e: photo routes 401 without a session; a
      100-slide run never has more than two full-screen images; demo uses
      stock photos. (`e2e/photos.spec.ts`)

### Phase 14 Verification

| Check | Evidence |
|-------|----------|
| Auth gate | Photo routes PIN-gated; private cache headers |
| Bundle gate | No Drive identifiers in bundles |
| Floor gate | ≤ 1920×1080 images, ≤ 2 in the DOM, opacity-only fades |
| Uptime gate | List cache expiry and stale-serve tests |
| Device gate | 24-hour soak with the slideshow running, or pending |

**Stop after this gate.**
