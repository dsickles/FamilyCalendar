# Specification: Photos from a Private Drive Folder

**Feature ID**: `14-photos`
**Created**: 2026-10-27
**Status**: Draft, pending owner review. Implementation starts only on "implement Phase 14".
**Input**: Family wall redesign plan (decision D5; "Photos tab from a Google Drive folder")
**Constitution check**: Principles II (images ≤ 1920×1080, at most two decoded, no blur), III (photos private, PIN-gated, `Cache-Control: private`, Drive credentials server-only), IV (8-second timeouts, 1800-second list cache, stale over blank, no slide DOM build-up)
**Project context**: `.spec/project.md`
**Depends on**: `10-frame-shell.md`. Needs from Dan: a Google Cloud service account, its JSON key, and one Drive folder shared with it as Viewer.

The Photos tab and the Today photo tile play photos from one private
Google Drive folder. The server lists the folder and serves each photo
resized for the frame. The frame never sees a Drive URL.

## User Scenarios & Testing

### User Story 1 — A photo dropped in the folder shows on the wall (Priority: P1)

**Independent Test**: With a test folder fixture (a mocked Drive client in
unit tests; a real folder in an opt-in check), a new photo appears in the
slideshow after the list cache expires.

**Acceptance Scenarios**:

1. **Given** the service account can read the folder, **When** the wall
   loads Photos, **Then** it plays a full-screen slideshow with a slow
   crossfade every 20 seconds and the date (and place, when the photo has
   it) in a corner.
2. **Given** a new photo in the folder, **When** 30 minutes pass, **Then**
   it is in the rotation.
3. **Given** the photo list, **When** it is shown, **Then** order is
   shuffled once per day, and photos taken on today's date in earlier years
   are placed first with a "1 year ago" (or "N years ago") label.
4. **Given** the Today tile, **When** it renders, **Then** it cycles
   through the same list at the same pace.

### User Story 2 — Photos never leak (Priority: P1)

**Acceptance Scenarios**:

1. **Given** no session cookie in live mode, **When** `/api/photos` or
   `/api/photos/<id>` is requested, **Then** it returns 401.
2. **Given** a photo response, **When** its headers are read, **Then**
   `Cache-Control` is `private, max-age=86400` and no Drive URL or file
   name is in the body or headers.
3. **Given** the client bundle, **When** it is scanned, **Then** it has no
   service account email, key, or folder ID.
4. **Given** demo mode, **When** Photos loads, **Then** it uses the
   prototype's public stock photos and never reads Drive.

### User Story 3 — The frame's memory stays flat (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a folder of 5,000 photos, **When** the slideshow runs for 24
   hours, **Then** at most two `<img>` elements for full-screen photos
   exist at any time, and the device gate's memory check passes.
2. **Given** a camera file of 24 MP, **When** it is served, **Then** the
   response is a JPEG or WebP no larger than 1920×1080, under 600 KB.

### Edge Cases

- Drive is down or slow: the list request times out at 8 seconds and the
  last-known list is used; individual photo failures skip to the next one.
- The folder is empty or unshared: Photos shows "No photos yet. Add some to
  the shared folder." and Today hides the tile.
- HEIC from iPhones: converted on the server, or skipped with a log line if
  conversion isn't available.
- Portrait photos: shown whole, centered on a soft paper background, not
  cropped to fill.

## Requirements

- **FR-001**: Config: `GOOGLE_SERVICE_ACCOUNT_JSON` (the key file's JSON)
  and `PHOTOS_DRIVE_FOLDER_ID`, both server-only secrets.
- **FR-002**: `lib/photos/drive.ts` MUST list image files in the folder
  (Drive API v3 `files.list`, fields `id, name, mimeType,
  imageMediaMetadata(time, location), createdTime`), paging through all
  results, with an 8-second timeout per request.
- **FR-003**: The list MUST be cached in memory for 1800 seconds under a
  key derived from the folder ID; expired data is served stale on failure.
- **FR-004**: `GET /api/photos` returns `{ photos: [{ id, takenAt?,
  place? }], stale }` where `id` is an opaque HMAC of the Drive file ID
  (keyed with a server secret), never the Drive ID itself.
- **FR-005**: `GET /api/photos/<id>` fetches the file, resizes it with
  `sharp` to fit 1920×1080 (no upscaling), encodes WebP (quality 80, JPEG
  fallback), and caches the resized bytes for 24 hours in memory up to
  100 MB total (least recently used evicted).
- **FR-006**: The client slideshow MUST preload only the next photo, keep
  at most two full-screen images in the DOM, crossfade with `opacity`, and
  remove the old element after the fade.
- **FR-007**: The Photos tab MUST stay exempt from the idle return to
  Today, as in Phase 10.
- **FR-008**: `.env.example` documents both variables with empty values,
  and the bundle gate scans for a fake test service account email.

## Success Criteria

- **SC-001**: A photo added to the folder appears within 30 minutes.
- **SC-002**: Unauthenticated photo requests get 401; bundles hold no Drive
  identifiers.
- **SC-003**: Two or fewer full-screen images exist in the DOM at any
  moment over a 100-slide e2e run.

## Out of Scope

- Google Photos albums or iCloud shared albums.
- Uploading from the wall or the phone page.
- Night dimming with a dark photo (an idea for later).

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| FR-001, FR-004, FR-008 | III (server-only credentials, opaque IDs) |
| FR-002, FR-003, FR-005 | IV (timeouts, bounded caches, stale over blank) |
| FR-005, FR-006 | II (≤ 1920×1080, two decoded images, opacity only) |
| FR-007 | IV (idle rule) |
