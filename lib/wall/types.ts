// Prototype data shapes for the tabbed family wall. Everything here is
// sample data held in the browser; nothing is saved on the server yet.

export type PersonId = string;

export interface WallPerson {
  id: PersonId;
  name: string;
  color: string;
  /** Text colour on top of `color`. */
  ink: string;
}

export interface WallEvent {
  id: string;
  title: string;
  location: string;
  start: number;
  end: number;
  allDay: boolean;
  /** Lane the event belongs to (a person, or the shared family lane). */
  personId: PersonId;
}

export type Aisle =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "pantry"
  | "frozen"
  | "household"
  | "other";

export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  aisle: Aisle;
  addedBy: string;
  addedAt: number;
  done: boolean;
  doneAt: number | null;
}

export interface TodoNote {
  text: string;
  by: string;
  at: number;
}

export interface Todo {
  id: string;
  title: string;
  owner: PersonId | "either";
  /** Local date key, YYYY-MM-DD. */
  due: string | null;
  notes: TodoNote[];
  done: boolean;
  updatedBy: string;
  updatedAt: number;
}

export interface Ingredient {
  name: string;
  qty: string;
  have: boolean;
  aisle: Aisle;
}

export interface PrepItem {
  item: string;
  cut: string;
}

export interface TimelineStep {
  /** Minutes before the meal is served (positive) or after (negative). */
  before: number;
  label: string;
}

export interface Meal {
  slot: "breakfast" | "lunch" | "dinner";
  name: string;
  forWho?: string;
  serveAt?: string;
  heat?: { setting: string; detail: string };
  timeline?: TimelineStep[];
  prep?: PrepItem[];
  steps?: string[];
  ingredients?: Ingredient[];
  setBy: string;
}

export interface MealDay {
  /** Local date key, YYYY-MM-DD. */
  date: string;
  meals: Meal[];
  defrost?: string;
}

export interface BotNote {
  id: string;
  text: string;
  by: string;
  at: number;
  until: number;
}

export interface ActivityEntry {
  id: string;
  at: number;
  by: string;
  text: string;
}

export interface WallData {
  /** Day the sample data was seeded, so it can be re-seeded each morning. */
  seededFor: string;
  shopping: ShoppingItem[];
  todos: Todo[];
  meals: MealDay[];
  notes: BotNote[];
  activity: ActivityEntry[];
}
