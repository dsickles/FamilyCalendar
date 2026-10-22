"use client";

import { Plus } from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { CheckBox } from "@/components/wall/parts";
import { agoLabel, dueLabel } from "@/lib/wall/format";
import { NowProvider, useNow } from "@/lib/wall/now";
import { AISLE_LABEL, AISLE_ORDER, SAMPLE_PEOPLE } from "@/lib/wall/sample-data";
import {
  addShoppingItem,
  addTodo,
  addTodoNote,
  clearTicked,
  toggleShoppingItem,
  toggleTodo,
  useWallData,
} from "@/lib/wall/store";

// The phone page from the plan (decision D3): one link, the same PIN, a name
// remembered on this phone. In the prototype it shares the wall's sample
// data only inside the same browser.

const NAME_KEY = "family-wall-phone-name";
const nameListeners = new Set<() => void>();

function readName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // Not saved: the phone asks again next time.
  }
  for (const listener of nameListeners) {
    listener();
  }
}

function subscribeName(listener: () => void) {
  nameListeners.add(listener);
  return () => nameListeners.delete(listener);
}

type PhoneTab = "list" | "todos" | "activity";

function NamePrompt() {
  const [draft, setDraft] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim()) {
      saveName(draft.trim());
    }
  }
  return (
    <form className="p-card p-name" onSubmit={submit}>
      <h1 className="w-serif">Who&apos;s this?</h1>
      <p>Your name goes next to things you add, so everyone can tell who asked for what.</p>
      <div className="p-quick">
        {SAMPLE_PEOPLE.slice(0, 2).map((person) => (
          <button
            key={person.id}
            type="button"
            className="w-chip"
            onClick={() => saveName(person.name)}
          >
            {person.name}
          </button>
        ))}
      </div>
      <input
        className="p-input"
        placeholder="Or type a name"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        autoComplete="given-name"
      />
      <button type="submit" className="w-btn w-btn--solid" disabled={!draft.trim()}>
        Continue
      </button>
    </form>
  );
}

function ListTab({ name }: { name: string }) {
  const data = useWallData();
  const [draft, setDraft] = useState("");
  const now = useNow().now.getTime();
  const ticked = data.shopping.filter((item) => item.done).length;

  function submit(event: FormEvent) {
    event.preventDefault();
    // "3 lemons" → qty 3, name lemons.
    const match = /^(\d+)\s+(.+)$/.exec(draft.trim());
    if (match) {
      addShoppingItem(match[2], name, match[1]);
    } else {
      addShoppingItem(draft, name);
    }
    setDraft("");
  }

  return (
    <>
      <form className="p-add" onSubmit={submit}>
        <input
          className="p-input"
          placeholder="Add to the list, e.g. 3 lemons"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          enterKeyHint="done"
        />
        <button
          type="submit"
          className="w-btn w-btn--solid"
          aria-label="Add"
          disabled={!draft.trim()}
        >
          <Plus aria-hidden size="1.3em" />
        </button>
      </form>
      {AISLE_ORDER.map((aisle) => {
        const items = data.shopping.filter((item) => item.aisle === aisle);
        if (!items.length) {
          return null;
        }
        return (
          <section key={aisle} className="p-section">
            <span className="w-label">{AISLE_LABEL[aisle]}</span>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-item${item.done ? " is-done" : ""}`}
                onClick={() => toggleShoppingItem(item.id, name)}
                aria-pressed={item.done}
              >
                <CheckBox on={item.done} />
                <span className="w-item-text">
                  <b>
                    {item.name}
                    {item.qty ? ` · ${item.qty}` : ""}
                  </b>
                  <small>
                    {item.addedBy} · {agoLabel(item.addedAt, now)}
                  </small>
                </span>
              </button>
            ))}
          </section>
        );
      })}
      {ticked ? (
        <button type="button" className="w-btn" onClick={() => clearTicked(name)}>
          Clear {ticked} ticked
        </button>
      ) : null}
    </>
  );
}

function TodosPhoneTab({ name }: { name: string }) {
  const data = useWallData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const today = useNow().now;
  const now = today.getTime();
  const open = data.todos.filter((todo) => !todo.done);

  function submitTodo(event: FormEvent) {
    event.preventDefault();
    const me = SAMPLE_PEOPLE.find((person) => person.name.toLowerCase() === name.toLowerCase());
    addTodo(title, me?.id ?? "either", null, name);
    setTitle("");
  }

  return (
    <>
      <form className="p-add" onSubmit={submitTodo}>
        <input
          className="p-input"
          placeholder="New to-do"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button
          type="submit"
          className="w-btn w-btn--solid"
          aria-label="Add to-do"
          disabled={!title.trim()}
        >
          <Plus aria-hidden size="1.3em" />
        </button>
      </form>
      {open.map((todo) => {
        const due = todo.due ? dueLabel(todo.due, today) : null;
        const owner = SAMPLE_PEOPLE.find((person) => person.id === todo.owner)?.name ?? "Either";
        const expanded = openId === todo.id;
        return (
          <div key={todo.id} className="p-card p-todo">
            <div className="p-todo-row">
              <button
                type="button"
                aria-label={`Mark ${todo.title} done`}
                onClick={() => toggleTodo(todo.id, name)}
              >
                <CheckBox on={false} />
              </button>
              <button
                type="button"
                className="p-todo-main"
                onClick={() => setOpenId(expanded ? null : todo.id)}
              >
                <b>{todo.title}</b>
                <span className="w-todo-meta">
                  {due ? <span className={`w-tag w-tag--${due.tone}`}>{due.text}</span> : null}
                  <span className="w-tag">{owner}</span>
                  {todo.notes.length ? (
                    <span className="w-tag">
                      {todo.notes.length} {todo.notes.length === 1 ? "note" : "notes"}
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
            {expanded ? (
              <div className="p-notes">
                {todo.notes.map((entry) => (
                  <p key={`${entry.at}-${entry.by}`}>
                    {entry.text}
                    <small>
                      {entry.by} · {agoLabel(entry.at, now)}
                    </small>
                  </p>
                ))}
                <form
                  className="p-add"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addTodoNote(todo.id, note, name);
                    setNote("");
                  }}
                >
                  <input
                    className="p-input"
                    placeholder="Add a detail"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <button type="submit" className="w-btn w-btn--solid" disabled={!note.trim()}>
                    Add
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function ActivityTab() {
  const data = useWallData();
  const now = useNow().now.getTime();
  return (
    <ul className="w-activity p-card">
      {data.activity.map((entry) => (
        <li key={entry.id}>
          <span>
            <b>{entry.by}</b> {entry.text.charAt(0).toLowerCase() + entry.text.slice(1)}
          </span>
          <small>{agoLabel(entry.at, now)}</small>
        </li>
      ))}
    </ul>
  );
}

export default function PhonePage() {
  const mounted = useSyncExternalStore(
    subscribeName,
    () => true,
    () => false,
  );
  const name = useSyncExternalStore(subscribeName, readName, () => "");
  const [tab, setTab] = useState<PhoneTab>("list");

  return (
    <div className="w-root p-root">
      {!mounted ? null : !name ? (
        <div className="p-scroll">
          <NamePrompt />
        </div>
      ) : (
        <NowProvider>
          <div className="p-scroll">
            <header className="p-head">
              <h1 className="w-serif">
                {tab === "list" ? "Shopping" : tab === "todos" ? "To-dos" : "Recent changes"}
              </h1>
              <button type="button" className="p-who" onClick={() => saveName("")}>
                {name} · change
              </button>
            </header>
            <div className="w-seg p-tabs">
              {(["list", "todos", "activity"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? "is-on" : ""}
                  onClick={() => setTab(id)}
                >
                  {id === "list" ? "List" : id === "todos" ? "To-dos" : "Activity"}
                </button>
              ))}
            </div>
            {tab === "list" ? (
              <ListTab name={name} />
            ) : tab === "todos" ? (
              <TodosPhoneTab name={name} />
            ) : (
              <ActivityTab />
            )}
            <p className="p-foot">Prototype · sample data stays in this browser</p>
          </div>
        </NowProvider>
      )}
    </div>
  );
}
