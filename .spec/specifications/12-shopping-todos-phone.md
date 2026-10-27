# Specification: Shopping, To-dos, and the Phone Page

**Feature ID**: `12-shopping-todos-phone`
**Created**: 2026-10-27
**Status**: Draft, pending owner review. Implementation starts only on "implement Phase 12".
**Input**: Family wall redesign plan (decision D3; "Shopping list: wall, phone and bots"; "To-dos: shared between you, her and your bot")
**Constitution check**: Principles I (wall at 1920×1080, `/list` at 390×844, named scroll regions `shopping-list` and `todo-list`), III (PIN on `/list`, bot scopes `shopping` and `todos`, text only), IV (200-item and 300-to-do caps, pruning, stale over blank)
**Project context**: `.spec/project.md`
**Depends on**: `11-saved-data-and-bots.md`

One shopping list and one to-do list, saved on the server, with three ways
in: the wall, the phone page at `/list`, and bots. This phase replaces the
prototype's browser-only data for Shopping and To-dos in live mode.

## User Scenarios & Testing

### User Story 1 — Dan's wife adds to the list from the store aisle (Priority: P1)

She opens the saved home-screen link, which shows `/list`. The first time,
she enters the PIN and picks her name. She types "oat milk", taps Add, and
the wall's Shopping tab shows it within 30 seconds with her name.

**Why this priority**: This is the reason the wall needs saved data.

**Independent Test**: Live mode with the memory store. At 390×844, unlock,
set the name "Sam", add "oat milk". `GET /api/wall` lists it with
`addedBy: "Sam"`. A second browser at 1920×1080 shows it on the Shopping
tab after the next poll.

**Acceptance Scenarios**:

1. **Given** a phone with no saved name, **When** `/list` opens after the
   PIN, **Then** it asks "Who's adding?" with one button per person
   calendar and a free-text field, and remembers the choice on that phone
   (`localStorage`). The name is a label, not a login.
2. **Given** the list, **When** she adds "Oat milk" while "oat milk" is
   already open, **Then** the two merge into one line (quantities joined,
   for example "1 + 2"), and the activity log says "Sam added oat milk".
3. **Given** the list in the store, **When** she views it, **Then** open
   items are grouped by aisle in this order: produce, dairy, meat, bakery,
   pantry, frozen, household, other. New items get an aisle from a keyword
   map, and she can change it.
4. **Given** an item, **When** she ticks it, **Then** it is struck through
   for everyone and stays visible for 24 hours, then disappears.
5. **Given** a weak connection, **When** an add fails, **Then** the typed
   text stays in the field with "Didn't save, try again".

### User Story 2 — Anyone at the wall ticks things off (Priority: P1)

**Independent Test**: At 1920×1080, open Shopping, tick two items, tap
"Clear ticked". Both are gone for every client.

**Acceptance Scenarios**:

1. **Given** the Shopping tab, **When** it renders, **Then** it shows open
   items by aisle, each with a ≥ 44×44 tick target, plus a row of up to 12
   favourites (the most-added names) that add with one tap.
2. **Given** ticked items, **When** someone taps "Clear ticked", **Then**
   all ticked items are removed now.
3. **Given** more items than fit, **When** the list overflows, **Then**
   only the `shopping-list` region scrolls, with contained overscroll.
4. **Given** Today, **When** it renders, **Then** the shopping tile shows
   the open count and the first three items, and tapping it opens Shopping.

### User Story 3 — A to-do with details, shared between people and a bot (Priority: P1)

Dan's bot adds "Renew passports", owner Dan, due Nov 15. His wife adds a
detail from her phone: "Photos are in the hall drawer". Later the bot
appends "Appointment booked for Nov 12". Both details are kept.

**Independent Test**: Concurrent `todo.note` ops from the phone API and the
bot API on the same to-do both land, in order of arrival.

**Acceptance Scenarios**:

1. **Given** the To-dos tab on the wall, **When** it renders, **Then** open
   to-dos are grouped by owner (each person calendar, then "Either"), with
   overdue and due-today items first in each group, and a ≥ 44×44 done
   target on each.
2. **Given** a to-do with details, **When** it is tapped on the wall,
   **Then** its details open read-only with who wrote each line and when.
   Details are written from the phone page or by a bot, not on the wall.
3. **Given** the phone page's To-dos tab, **When** she adds or edits a
   to-do, **Then** she can set title, owner, due date, and append a detail.
4. **Given** a done to-do, **When** 30 days pass, **Then** it is pruned.
5. **Given** Today, **When** it renders, **Then** the to-do tile shows the
   count due today or overdue and the first three titles.

### User Story 4 — Bots manage the list and to-dos (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a key with scope `shopping`, **When** the bot calls
   `shopping.add` with "oat milk, 2 lemons" as two items, **Then** both are
   added (merged if already open) with the bot's name.
2. **Given** a key with scope `todos`, **When** the bot calls `todo.update`
   to change the owner or due date, **Then** only those fields change and
   details are untouched.
3. **Given** a key with only `shopping`, **When** it calls a `todo.*` op,
   **Then** it gets 403.

### User Story 5 — Anyone can see who changed what (Priority: P3)

**Acceptance Scenarios**:

1. **Given** the phone page, **When** she opens "Recent", **Then** she sees
   the last 50 activity entries (who, what, when), including bot writes.

### Edge Cases

- The list is at 200 items: an add returns "List is full" and nothing is
  dropped.
- A name in `by` longer than 40 characters is cut to 40.
- The same item ticked from two places at once: it ends ticked (ticking is
  idempotent on `done: true`).
- A person calendar is removed from config: its to-dos move to "Either" on
  display; the stored owner is kept.
- Demo mode: the wall and phone page keep the browser-local sample store;
  nothing is sent to the server.

## Requirements

### Functional Requirements — Operations

- **FR-001**: Add to the op table (scope `shopping`): `shopping.add
  { items: [{ name, qty?, aisle? }] }` (1–20 items), `shopping.tick
  { id, done }`, `shopping.remove { id }`, `shopping.clearTicked {}`,
  `shopping.list {}` (read).
- **FR-002**: Add (scope `todos`): `todo.add { title, owner, due?, detail? }`,
  `todo.note { id, text }` (append-only), `todo.update { id, title?,
  owner?, due? }`, `todo.done { id, done }`, `todo.list {}` (read).
- **FR-003**: Shopping merge MUST match open items on a normalized name
  (trimmed, lower-case, collapsed spaces, simple plural `s` dropped).
  Merged quantities join with " + ".
- **FR-004**: The aisle keyword map MUST live in `lib/wall/aisles.ts`,
  shared by the server and the phone page, and be unit-tested.
- **FR-005**: Favourites MUST come from a per-name add counter stored with
  the shopping collection, capped at the 100 most recent names.
- **FR-006**: `owner` is a person calendar id or `"either"`. `due` is a
  local date `YYYY-MM-DD`.

### Functional Requirements — Wall

- **FR-007**: In live mode the Shopping and To-dos tabs and their Today
  tiles MUST read `GET /api/wall` and write `POST /api/wall`, with
  optimistic updates rolled back on failure. The "Sample data" flag is
  removed for them.
- **FR-008**: The list bodies MUST be the named scroll regions
  `shopping-list` and `todo-list`.

### Functional Requirements — Phone page

- **FR-009**: `/list` MUST be a portrait layout for 390×844 with two tabs,
  List and To-dos, plus Recent. It MUST fit 360 px wide without horizontal
  scroll (best-effort below 390).
- **FR-010**: `/list` MUST provide its own web app manifest entry or
  `apple-touch-icon` so "Add to Home Screen" opens it directly.
- **FR-011**: The phone page MUST poll like the wall (FR-012 in Phase 11)
  while visible and re-fetch on focus.

## Success Criteria

- **SC-001**: A phone add appears on the wall within 30 seconds.
- **SC-002**: Concurrent detail appends from the phone and a bot both land.
- **SC-003**: The viewport gate passes for Shopping and To-dos at 1920×1080
  with 200 items, and for `/list` at 390×844.
- **SC-004**: Caps and pruning hold in unit tests (200 items, 24-hour
  ticked, 300 open to-dos, 30-day done).

## Out of Scope

- Sorting by store layout per shop, prices, or sharing with list apps.
- Push notifications.
- Chores.

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| FR-001 to FR-006 | III (scopes, text only), IV (caps) |
| FR-007, FR-008 | I (scroll regions), IV (stale over blank) |
| FR-009 to FR-011 | I (phone gate), III (PIN on `/list`), IV (bounded polling) |
