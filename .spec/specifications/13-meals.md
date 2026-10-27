# Specification: Meals

**Feature ID**: `13-meals`
**Created**: 2026-10-27
**Status**: Draft, pending owner review. Implementation starts only on "implement Phase 13".
**Input**: Family wall redesign plan ("Meals tab for the kitchen", bot action "Set meals for a day")
**Constitution check**: Principles I (cooking card readable across the counter at 1920×1080; `meal-steps` scroll region), III (bot scope `meals`, text only), IV (meals kept from 14 days back to 14 days ahead)
**Project context**: `.spec/project.md`
**Depends on**: `11-saved-data-and-bots.md`. Uses `shopping.add` from `12-shopping-todos-phone.md` for the missing-ingredients button; if Phase 13 lands first, that button stays hidden until Phase 12.

Dan's bots write the meal plan. The Meals tab shows today's breakfast,
lunch, and dinner, with dinner as a cooking card readable from across the
counter, and a strip of the next few dinners.

## User Scenarios & Testing

### User Story 1 — A bot plans the week's dinners (Priority: P1)

**Independent Test**: With a `meals` key, call `meals.setDay` for 7 dates.
The Meals tab and the Today dinner tile show each day's dinner on that day.

**Acceptance Scenarios**:

1. **Given** a `meals` key, **When** the bot sends `meals.setDay { date,
   meals[], defrost? }`, **Then** that date's meals are replaced as a whole
   and the log says "<Bot> planned meals for <date>".
2. **Given** `meals.setMeal { date, slot, meal }`, **When** it is sent,
   **Then** only that slot changes.
3. **Given** a date more than 14 days ahead or more than 1 day back,
   **When** the bot writes it, **Then** the API returns 400.
4. **Given** a meal over 16 KB, **When** it is sent, **Then** it gets 400.

### User Story 2 — Cooking dinner from the wall (Priority: P1)

**Independent Test**: At 1920×1080 with a full sample dinner (heat,
timeline, 8 prep items, 12 steps, 14 ingredients), the card fits with only
the `meal-steps` region scrolling.

**Acceptance Scenarios**:

1. **Given** today's dinner, **When** Meals renders, **Then** the card
   shows the name and who it's for, the heat setting in large type ("425°F,
   convection"), the timeline counted back from the serve time ("5:40
   preheat · 5:50 sheet pan in · 6:15 rest"), the prep list with cuts, the
   steps one per line, and the ingredients.
2. **Given** the timeline, **When** a step's time has passed, **Then** it
   is dimmed, and the next step is highlighted.
3. **Given** ingredients marked as not on hand, **When** someone taps "Add
   N missing to list", **Then** each goes to the shopping list with its
   aisle (merged if already there), and the button changes to "Added".
4. **Given** breakfast and lunch, **When** Meals renders, **Then** they show
   as compact rows above or beside the dinner card.
5. **Given** the next 5 days, **When** Meals renders, **Then** a bottom
   strip shows each dinner name and any defrost note ("Move chicken to the
   fridge").

### User Story 3 — Fix a meal from the phone (Priority: P2)

**Acceptance Scenarios**:

1. **Given** the phone page, **When** she opens Meals, **Then** she sees
   the next 7 days and can rename or clear a meal and tick ingredients she
   has. The log records it with her name.

### Edge Cases

- No meals for today: Meals shows "No plan for today" and the next planned
  day; the Today tile hides.
- No serve time: the timeline shows durations ("preheat 20 min") instead of
  clock times.
- A meal with only a name: the card shows the name large and nothing else.

## Requirements

- **FR-001**: Add to the op table (scope `meals`): `meals.setDay`,
  `meals.setMeal`, `meals.clear { date, slot }`, `meals.have { date, slot,
  ingredient, have }`, and `meals.list { from, to }` (read).
- **FR-002**: `Meal` keeps the prototype shape: `slot`, `name`, `forWho?`,
  `serveAt?` (`HH:MM`), `heat? { setting, detail }`, `timeline?
  [{ before, label }]` (minutes before serving), `prep? [{ item, cut }]`,
  `steps? string[]` (≤ 30), `ingredients? [{ name, qty, have, aisle }]`
  (≤ 40), `setBy`. `MealDay` is `{ date, meals[], defrost? }`.
- **FR-003**: The store MUST prune meal days older than 14 days on every
  meals write.
- **FR-004**: The cooking card's steps MUST be the `meal-steps` named
  scroll region. Body text on the card MUST be at least 24 CSS px and the
  heat setting at least 56 CSS px.
- **FR-005**: The Today dinner tile and the Meals tab MUST read the store
  in live mode; the "Sample data" flag is removed for them.

## Success Criteria

- **SC-001**: A bot-written week shows on the right days, including across
  midnight.
- **SC-002**: The viewport gate passes on Meals with the largest allowed
  meal.
- **SC-003**: "Add missing to list" adds each missing ingredient once.

## Out of Scope

- Kitchen timers with sound (the frame's speaker is untested).
- A recipe library or recipe import.
- Nutrition or calorie data.

## Constitution Traceability

| Requirement | Principle |
|-------------|-----------|
| FR-001, FR-002 | III (scopes, size limits, text only) |
| FR-003 | IV (store caps) |
| FR-004 | I (scroll region, legibility on the frame) |
| FR-005 | IV (stale over blank) |
