"use client";

import {
  Bot,
  CalendarDays,
  CookingPot,
  House,
  Image as ImageIcon,
  ListChecks,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { clockParts, type ClockFormat } from "@/lib/wall/format";

export type WallTab = "today" | "calendar" | "meals" | "shopping" | "todos" | "photos";

export const TABS: Array<{ id: WallTab; label: string; icon: LucideIcon }> = [
  { id: "today", label: "Today", icon: House },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "meals", label: "Meals", icon: CookingPot },
  { id: "shopping", label: "Shopping", icon: ShoppingCart },
  { id: "todos", label: "To-dos", icon: ListChecks },
  { id: "photos", label: "Photos", icon: ImageIcon },
];

type RailProps = {
  tab: WallTab;
  onTab: (tab: WallTab) => void;
  now: Date;
  timeFormat: ClockFormat;
  lock: ReactNode;
  onBots: () => void;
  botsOpen: boolean;
};

export default function Rail({ tab, onTab, now, timeFormat, lock, onBots, botsOpen }: RailProps) {
  const clock = clockParts(now, timeFormat);
  return (
    <nav className="w-rail" aria-label="Sections">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`w-rail-item${tab === id ? " is-active" : ""}`}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onTab(id)}
        >
          <Icon aria-hidden strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
      <div className="w-rail-foot">
        <button
          type="button"
          className={`w-rail-item${botsOpen ? " is-active" : ""}`}
          style={{ width: "100%" }}
          onClick={onBots}
          aria-label="Bot updates and demo controls"
        >
          <Bot aria-hidden strokeWidth={2} />
          <span>Bots</span>
        </button>
        <div className="w-rail-clock">
          <b className="w-num">{clock.time}</b>
          {clock.suffix ? <span>{clock.suffix}</span> : null}
        </div>
        {lock ? <div className="w-rail-lock">{lock}</div> : null}
      </div>
    </nav>
  );
}
