// Display helpers for the wall prototype. They use the browser's local
// time, which on the frame is the household's time zone.

export type ClockFormat = "12h" | "24h";

export function clockParts(date: Date, format: ClockFormat): { time: string; suffix: string } {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  if (format === "24h") {
    return { time: `${String(h).padStart(2, "0")}:${m}`, suffix: "" };
  }
  return { time: `${h % 12 || 12}:${m}`, suffix: h >= 12 ? "PM" : "AM" };
}

export function timeLabel(ms: number, format: ClockFormat): string {
  const { time, suffix } = clockParts(new Date(ms), format);
  return suffix ? `${time} ${suffix}` : time;
}

export function rangeLabel(start: number, end: number, format: ClockFormat): string {
  const a = clockParts(new Date(start), format);
  const b = clockParts(new Date(end), format);
  if (format === "24h") {
    return `${a.time} – ${b.time}`;
  }
  return a.suffix === b.suffix
    ? `${a.time} – ${b.time} ${b.suffix}`
    : `${a.time} ${a.suffix} – ${b.time} ${b.suffix}`;
}

export function minutesLabel(mins: number): string {
  const total = Math.max(0, Math.round(mins));
  if (total < 60) {
    return `${total} min`;
  }
  const h = Math.floor(total / 60);
  const r = total % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

export function agoLabel(ms: number, now: number): string {
  const mins = Math.round((now - ms) / 60_000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function weekdayLong(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function weekdayShort(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function monthDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Overdue", "Today", "Tomorrow", "Fri", or "Nov 15". */
export function dueLabel(
  key: string,
  today: Date,
): { text: string; tone: "late" | "today" | "soon" | "later" } {
  const due = dateFromKey(key);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) {
    return { text: "Overdue", tone: "late" };
  }
  if (diff === 0) {
    return { text: "Today", tone: "today" };
  }
  if (diff === 1) {
    return { text: "Tomorrow", tone: "soon" };
  }
  if (diff < 7) {
    return { text: weekdayShort(due), tone: "soon" };
  }
  return {
    text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    tone: "later",
  };
}
