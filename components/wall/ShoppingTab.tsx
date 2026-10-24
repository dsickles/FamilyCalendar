"use client";

import { Plus, Trash2 } from "lucide-react";
import { CheckBox } from "@/components/wall/parts";
import { agoLabel } from "@/lib/wall/format";
import { AISLE_LABEL, AISLE_ORDER, FAVOURITES } from "@/lib/wall/sample-data";
import { addShoppingItem, clearTicked, toggleShoppingItem } from "@/lib/wall/store";
import type { WallData } from "@/lib/wall/types";

// The wall shows as many items as fit; the phone page shows the whole list.
const MAX_ON_WALL = 30;

export default function ShoppingTab({ now, data }: { now: Date; data: WallData }) {
  const nowMs = now.getTime();
  const open = data.shopping.filter((item) => !item.done);
  const ticked = data.shopping.filter((item) => item.done);
  const shown = [...open, ...ticked].slice(0, MAX_ON_WALL);
  const hidden = data.shopping.length - shown.length;
  const onList = new Set(open.map((item) => item.name.toLowerCase()));
  const shopActivity = data.activity
    .filter((entry) => /list|tick|clear/i.test(entry.text))
    .slice(0, 6);

  return (
    <div className="w-shop">
      <div className="w-head">
        <h1>
          Shopping <i>{open.length} to get</i>
        </h1>
        <div className="w-head-actions">
          <button
            type="button"
            className="w-btn"
            disabled={!ticked.length}
            onClick={() => clearTicked("Wall")}
          >
            <Trash2 aria-hidden size="1.2em" />
            Clear {ticked.length} ticked
          </button>
        </div>
      </div>
      <div className="w-shop-body">
        <div className="w-aisles">
          {AISLE_ORDER.map((aisle) => {
            const items = shown.filter((item) => item.aisle === aisle);
            if (!items.length) {
              return null;
            }
            return (
              <section key={aisle} className="w-aisle" aria-label={AISLE_LABEL[aisle]}>
                <span className="w-label">{AISLE_LABEL[aisle]}</span>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-item${item.done ? " is-done" : ""}`}
                    aria-pressed={item.done}
                    onClick={() => toggleShoppingItem(item.id, "Wall")}
                  >
                    <CheckBox on={item.done} />
                    <span className="w-item-text">
                      <b>
                        {item.name}
                        {item.qty ? ` · ${item.qty}` : ""}
                      </b>
                      <small>
                        {item.addedBy} · {agoLabel(item.addedAt, nowMs)}
                      </small>
                    </span>
                  </button>
                ))}
              </section>
            );
          })}
          {hidden > 0 ? <p className="w-hint">+{hidden} more on the phone page</p> : null}
        </div>
        <aside className="w-shop-side">
          <div className="w-card">
            <span className="w-label" style={{ marginBottom: "calc(12 * var(--u))" }}>
              Quick add
            </span>
            <div className="w-chips">
              {FAVOURITES.map((fav) => {
                const already = onList.has(fav.name.toLowerCase());
                return (
                  <button
                    key={fav.name}
                    type="button"
                    className="w-chip"
                    disabled={already}
                    style={already ? { opacity: 0.4 } : undefined}
                    onClick={() => addShoppingItem(fav.name, "Wall", "", fav.aisle)}
                  >
                    <Plus aria-hidden size="1em" />
                    {fav.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-card">
            <span className="w-label">From a phone</span>
            <p className="w-hint" style={{ marginTop: "calc(8 * var(--u))" }}>
              Open <code>/wall/list</code> on a phone to add with typing and tick things off in the
              store. In this prototype it syncs with the wall only inside the same browser.
            </p>
          </div>
          <div className="w-card" style={{ flex: 1 }}>
            <span className="w-label">Recent changes</span>
            <ul className="w-activity">
              {shopActivity.map((entry) => (
                <li key={entry.id}>
                  <span>
                    <b>{entry.by}</b> {entry.text.charAt(0).toLowerCase() + entry.text.slice(1)}
                  </span>
                  <small>{agoLabel(entry.at, nowMs)}</small>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
