"use client";

import { Bot, Clock, RotateCcw, X } from "lucide-react";
import { agoLabel } from "@/lib/wall/format";
import { offsetTo, useNow } from "@/lib/wall/now";
import { BOT_NAME } from "@/lib/wall/sample-data";
import { BOT_ACTIONS, resetWallData } from "@/lib/wall/store";
import type { WallData } from "@/lib/wall/types";

const TIME_JUMPS: Array<{ label: string; h: number; m: number }> = [
  { label: "7:15 AM", h: 7, m: 15 },
  { label: "3:05 PM", h: 15, m: 5 },
  { label: "5:30 PM", h: 17, m: 30 },
  { label: "9:15 PM", h: 21, m: 15 },
];

// Prototype-only panel. It plays the part of a bot calling the wall's API
// (Phase 11 in the plan) and lets you move the clock to see Today change.
export default function BotPanel({ data, onClose }: { data: WallData; onClose: () => void }) {
  const { now, offsetMs, setOffset } = useNow();
  const nowMs = now.getTime();

  return (
    <div className="w-sheet-layer" onClick={onClose}>
      <div
        className="w-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Bot updates"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-sheet-head">
          <div>
            <span className="w-label">Prototype controls</span>
            <h2 style={{ marginTop: "calc(8 * var(--u))" }}>Pretend to be {BOT_NAME}</h2>
          </div>
          <button type="button" className="w-icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden />
          </button>
        </div>
        <p className="w-hint">
          Each button does what a bot would do through the wall&apos;s API: it sends data, and the
          wall decides how it looks.
        </p>
        <div className="w-sheet-actions">
          {BOT_ACTIONS.map((action) => (
            <button key={action.id} type="button" className="w-btn" onClick={action.run}>
              <Bot aria-hidden size="1.2em" />
              {action.label}
            </button>
          ))}
        </div>

        <span className="w-label">
          <Clock aria-hidden size="1em" /> Jump the clock
        </span>
        <div className="w-chips">
          {TIME_JUMPS.map((jump) => (
            <button
              key={jump.label}
              type="button"
              className="w-chip"
              onClick={() => setOffset(offsetTo(jump.h, jump.m))}
            >
              {jump.label}
            </button>
          ))}
          <button
            type="button"
            className="w-chip"
            disabled={offsetMs === 0}
            style={offsetMs === 0 ? { opacity: 0.4 } : undefined}
            onClick={() => setOffset(0)}
          >
            Real time
          </button>
        </div>

        <span className="w-label">Recent writes</span>
        <ul className="w-activity" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {data.activity.slice(0, 8).map((entry) => (
            <li key={entry.id}>
              <span>
                <b>{entry.by}</b> {entry.text.charAt(0).toLowerCase() + entry.text.slice(1)}
              </span>
              <small>{agoLabel(entry.at, nowMs)}</small>
            </li>
          ))}
        </ul>
        <button type="button" className="w-btn" onClick={resetWallData}>
          <RotateCcw aria-hidden size="1.2em" />
          Reset sample data
        </button>
      </div>
    </div>
  );
}
