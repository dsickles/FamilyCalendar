"use client";

import { useSyncExternalStore } from "react";
import { BOT_NAME, addDays, dayKey, guessAisle, seedWallData } from "@/lib/wall/sample-data";
import type { Aisle, WallData } from "@/lib/wall/types";

// Prototype store. It stands in for the saved data that Phase 11 adds on the
// server: state lives in this browser's localStorage only, and other tabs of
// the same browser (the wall and the /wall/list phone page) stay in sync
// through the `storage` event. Nothing is sent anywhere.

const STORAGE_KEY = "family-wall-prototype-v1";
const MAX_ACTIVITY = 30;
const MAX_SHOPPING = 200;

let data: WallData | null = null;
const listeners = new Set<() => void>();

function load(): WallData {
  const today = dayKey(new Date());
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WallData;
      // Re-seed each morning so "today" in the sample data stays today.
      if (parsed.seededFor === today) {
        return parsed;
      }
    }
  } catch {
    // Private mode or bad JSON: fall through to fresh sample data.
  }
  return seedWallData();
}

function save(next: WallData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the change still shows until reload.
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    data = load();
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): WallData {
  if (!data) {
    data = load();
  }
  return data;
}

// Shared placeholder for the server render; the wall renders after mount.
let serverData: WallData | null = null;
function getServerSnapshot(): WallData {
  if (!serverData) {
    serverData = seedWallData(new Date(0));
  }
  return serverData;
}

export function useWallData(): WallData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function update(change: (draft: WallData) => WallData, log?: { by: string; text: string }) {
  let next = change(getSnapshot());
  if (log) {
    next = {
      ...next,
      activity: [{ id: uid(), at: Date.now(), by: log.by, text: log.text }, ...next.activity].slice(
        0,
        MAX_ACTIVITY,
      ),
    };
  }
  data = next;
  save(next);
  emit();
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------- shopping

export function addShoppingItem(name: string, by: string, qty = "", aisle?: Aisle) {
  const typed = name.trim();
  if (!typed) {
    return;
  }
  const trimmed = typed.charAt(0).toUpperCase() + typed.slice(1);
  update(
    (d) => {
      // Adding the same item twice merges it into one line.
      const existing = d.shopping.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        return {
          ...d,
          shopping: d.shopping.map((item) =>
            item === existing
              ? {
                  ...item,
                  done: false,
                  doneAt: null,
                  qty: qty || item.qty,
                  addedBy: by,
                  addedAt: Date.now(),
                }
              : item,
          ),
        };
      }
      return {
        ...d,
        shopping: [
          {
            id: uid(),
            name: trimmed,
            qty,
            aisle: aisle ?? guessAisle(trimmed),
            addedBy: by,
            addedAt: Date.now(),
            done: false,
            doneAt: null,
          },
          ...d.shopping,
        ].slice(0, MAX_SHOPPING),
      };
    },
    { by, text: `Added ${trimmed}${qty ? ` ×${qty}` : ""} to the list` },
  );
}

export function toggleShoppingItem(id: string, by: string) {
  const item = getSnapshot().shopping.find((entry) => entry.id === id);
  if (!item) {
    return;
  }
  update(
    (d) => ({
      ...d,
      shopping: d.shopping.map((entry) =>
        entry.id === id
          ? { ...entry, done: !entry.done, doneAt: entry.done ? null : Date.now() }
          : entry,
      ),
    }),
    { by, text: `${item.done ? "Unticked" : "Ticked off"} ${item.name}` },
  );
}

export function clearTicked(by: string) {
  const count = getSnapshot().shopping.filter((item) => item.done).length;
  if (!count) {
    return;
  }
  update((d) => ({ ...d, shopping: d.shopping.filter((item) => !item.done) }), {
    by,
    text: `Cleared ${count} ticked item${count === 1 ? "" : "s"}`,
  });
}

// ---------------------------------------------------------------- to-dos

export function toggleTodo(id: string, by: string) {
  const todo = getSnapshot().todos.find((entry) => entry.id === id);
  if (!todo) {
    return;
  }
  update(
    (d) => ({
      ...d,
      todos: d.todos.map((entry) =>
        entry.id === id
          ? { ...entry, done: !entry.done, updatedBy: by, updatedAt: Date.now() }
          : entry,
      ),
    }),
    { by, text: `${todo.done ? "Reopened" : "Finished"} ${todo.title}` },
  );
}

export function addTodo(title: string, owner: string, due: string | null, by: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return;
  }
  update(
    (d) => ({
      ...d,
      todos: [
        {
          id: uid(),
          title: trimmed,
          owner,
          due,
          notes: [],
          done: false,
          updatedBy: by,
          updatedAt: Date.now(),
        },
        ...d.todos,
      ],
    }),
    { by, text: `Added to-do: ${trimmed}` },
  );
}

export function addTodoNote(id: string, text: string, by: string) {
  const trimmed = text.trim();
  const todo = getSnapshot().todos.find((entry) => entry.id === id);
  if (!trimmed || !todo) {
    return;
  }
  // Notes are appended, never replaced, so two people editing at once both keep theirs.
  update(
    (d) => ({
      ...d,
      todos: d.todos.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              notes: [...entry.notes, { text: trimmed, by, at: Date.now() }],
              updatedBy: by,
              updatedAt: Date.now(),
            }
          : entry,
      ),
    }),
    { by, text: `Added a note to ${todo.title}` },
  );
}

// ---------------------------------------------------------------- meals + notes

export function addMissingIngredients(date: string, by: string) {
  const day = getSnapshot().meals.find((entry) => entry.date === date);
  const dinner = day?.meals.find((meal) => meal.slot === "dinner");
  const missing = dinner?.ingredients?.filter((ingredient) => !ingredient.have) ?? [];
  for (const ingredient of missing) {
    addShoppingItem(ingredient.name, by, ingredient.qty, ingredient.aisle);
  }
}

export function dismissNote(id: string, by: string) {
  update((d) => ({ ...d, notes: d.notes.filter((note) => note.id !== id) }), {
    by,
    text: "Dismissed a note",
  });
}

export function resetWallData() {
  data = seedWallData();
  save(data);
  emit();
}

// ---------------------------------------------------------------- simulated bot

// These stand in for calls a bot would make to the Phase 11 API.
export const BOT_ACTIONS = [
  {
    id: "shop",
    label: "Add oat milk and 2 lemons",
    run: () => {
      addShoppingItem("Oat milk", BOT_NAME, "1");
      addShoppingItem("Lemons", BOT_NAME, "2");
    },
  },
  {
    id: "note",
    label: "Post a note",
    run: () => {
      const now = Date.now();
      update(
        (d) => ({
          ...d,
          notes: [
            {
              id: uid(),
              text: "Sam's soccer moved indoors to the high school gym.",
              by: BOT_NAME,
              at: now,
              until: now + 3 * 60 * 60_000,
            },
            ...d.notes,
          ].slice(0, 5),
        }),
        { by: BOT_NAME, text: "Posted a note: soccer moved indoors" },
      );
    },
  },
  {
    id: "todo-note",
    label: "Add a detail to the dentist to-do",
    run: () => addTodoNote("d1", "Tuesday 4:15 PM is open. Reply YES to book.", BOT_NAME),
  },
  {
    id: "todo",
    label: "Add a to-do for Alex",
    run: () => addTodo("Pick up dry cleaning", "alex", dayKey(addDays(new Date(), 1)), BOT_NAME),
  },
  {
    id: "meal",
    label: "Swap tomorrow's dinner",
    run: () => {
      const tomorrow = dayKey(addDays(new Date(), 1));
      update(
        (d) => ({
          ...d,
          meals: d.meals.map((day) =>
            day.date === tomorrow
              ? {
                  ...day,
                  defrost: undefined,
                  meals: day.meals.map((meal) =>
                    meal.slot === "dinner"
                      ? {
                          ...meal,
                          name: "Chicken stir-fry with broccoli",
                          heat: { setting: "High", detail: "Wok, oil shimmering" },
                          setBy: BOT_NAME,
                        }
                      : meal,
                  ),
                }
              : day,
          ),
        }),
        { by: BOT_NAME, text: "Changed tomorrow's dinner to chicken stir-fry" },
      );
    },
  },
] as const;
