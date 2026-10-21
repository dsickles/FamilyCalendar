"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Avatar, CheckBox, personStyle } from "@/components/wall/parts";
import { agoLabel, dueLabel } from "@/lib/wall/format";
import { toggleTodo } from "@/lib/wall/store";
import type { Todo, WallData, WallPerson } from "@/lib/wall/types";

type Column = { id: string; person: WallPerson; owners: string[] };

const EITHER: WallPerson = { id: "either", name: "Either", color: "#7a756b", ink: "#ffffff" };
const KIDS: WallPerson = { id: "kids", name: "Kids", color: "#0f9b76", ink: "#ffffff" };

function rank(todo: Todo, today: Date): number {
  if (!todo.due) {
    return 3;
  }
  const tone = dueLabel(todo.due, today).tone;
  return tone === "late" ? 0 : tone === "today" ? 1 : 2;
}

function sortTodos(list: Todo[], today: Date): Todo[] {
  return [...list].sort(
    (a, b) => rank(a, today) - rank(b, today) || (a.due ?? "~").localeCompare(b.due ?? "~"),
  );
}

function TodoSheet({ todo, now, onClose }: { todo: Todo; now: Date; onClose: () => void }) {
  const nowMs = now.getTime();
  return (
    <div className="w-sheet-layer" onClick={onClose}>
      <div
        className="w-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={todo.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-sheet-head">
          <div>
            <span className="w-label">
              To-do{todo.due ? ` · due ${dueLabel(todo.due, now).text.toLowerCase()}` : ""}
            </span>
            <h2 style={{ marginTop: "calc(8 * var(--u))" }}>{todo.title}</h2>
          </div>
          <button type="button" className="w-icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden />
          </button>
        </div>
        <div className="w-notes">
          {todo.notes.length ? (
            todo.notes.map((note) => (
              <div key={`${note.at}-${note.by}`} className="w-note">
                {note.text}
                <small>
                  {note.by} · {agoLabel(note.at, nowMs)}
                </small>
              </div>
            ))
          ) : (
            <p className="w-hint">No details yet.</p>
          )}
        </div>
        <p className="w-hint">
          Details are added from the phone page or by a bot, since typing on the wall is awkward.
          Last changed by {todo.updatedBy} {agoLabel(todo.updatedAt, nowMs)}.
        </p>
        <div style={{ marginTop: "auto", display: "flex", gap: "calc(12 * var(--u))" }}>
          <button
            type="button"
            className="w-btn w-btn--solid"
            onClick={() => {
              toggleTodo(todo.id, "Wall");
              onClose();
            }}
          >
            {todo.done ? "Reopen" : "Mark done"}
          </button>
          <button type="button" className="w-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TodosTab({
  now,
  data,
  people,
}: {
  now: Date;
  data: WallData;
  people: WallPerson[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const nowMs = now.getTime();
  const adults = people.slice(0, 2);
  const kids = people.slice(2).filter((person) => person.id !== "family");
  const columns: Column[] = [
    ...adults.map((person) => ({ id: person.id, person, owners: [person.id] })),
    { id: "either", person: EITHER, owners: ["either"] },
    { id: "kids", person: KIDS, owners: kids.map((kid) => kid.id) },
  ];
  const openTodo = data.todos.find((todo) => todo.id === openId) ?? null;
  const openCount = data.todos.filter((todo) => !todo.done).length;

  return (
    <div className="w-todos">
      <div className="w-head">
        <h1>
          To-dos <i>{openCount} open</i>
        </h1>
      </div>
      <div className="w-owners">
        {columns.map((column) => {
          const mine = data.todos.filter((todo) => column.owners.includes(todo.owner));
          const open = sortTodos(
            mine.filter((todo) => !todo.done),
            now,
          );
          const done = mine.filter((todo) => todo.done);
          return (
            <section
              key={column.id}
              className="w-owner"
              style={personStyle(column.person)}
              aria-label={column.person.name}
            >
              <div className="w-lane-head">
                <Avatar person={column.person} size={40} />
                <b>{column.person.name}</b>
              </div>
              {open.map((todo) => {
                const due = todo.due ? dueLabel(todo.due, now) : null;
                const last = todo.notes[todo.notes.length - 1];
                const kid = kids.find((person) => person.id === todo.owner);
                return (
                  <div key={todo.id} className="w-todo">
                    <button
                      type="button"
                      className="w-todo-check"
                      aria-label={`Mark ${todo.title} done`}
                      onClick={() => toggleTodo(todo.id, "Wall")}
                    >
                      <CheckBox on={false} />
                    </button>
                    <button
                      type="button"
                      className="w-todo-body"
                      onClick={() => setOpenId(todo.id)}
                    >
                      <span className="w-todo-title">{todo.title}</span>
                      <span className="w-todo-meta">
                        {due ? (
                          <span className={`w-tag w-tag--${due.tone}`}>{due.text}</span>
                        ) : null}
                        {kid ? <span className="w-tag">{kid.name}</span> : null}
                        {todo.notes.length ? (
                          <span className="w-tag">
                            {todo.notes.length} {todo.notes.length === 1 ? "note" : "notes"}
                          </span>
                        ) : null}
                      </span>
                      {last ? (
                        <span className="w-todo-note">
                          <b>{last.by}:</b> {last.text} · {agoLabel(last.at, nowMs)}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
              {!open.length ? (
                <p className="w-free">
                  <i>All clear</i>
                </p>
              ) : null}
              {done.length ? (
                <p className="w-done-row">
                  ✓ {done.length} done: {done.map((todo) => todo.title).join(", ")}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
      {openTodo ? <TodoSheet todo={openTodo} now={now} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
