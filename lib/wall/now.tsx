"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// One rAF loop for the whole wall. It re-renders only when the minute
// changes (constitution III), and supports a demo offset so the prototype
// can jump to another time of day.

type NowValue = { now: Date; offsetMs: number; setOffset: (ms: number) => void };

const NowContext = createContext<NowValue | null>(null);

function minuteOf(ms: number): number {
  return Math.floor(ms / 60_000);
}

export function NowProvider({ children }: { children: ReactNode }) {
  const [offsetMs, setOffsetMs] = useState(0);
  const [minute, setMinute] = useState(() => minuteOf(Date.now()));

  function setOffset(ms: number) {
    setOffsetMs(ms);
    setMinute(minuteOf(Date.now() + ms));
  }

  useEffect(() => {
    let frame = 0;
    let last = minuteOf(Date.now() + offsetMs);
    const tick = () => {
      const next = minuteOf(Date.now() + offsetMs);
      if (next !== last) {
        last = next;
        setMinute(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [offsetMs]);

  return (
    <NowContext.Provider value={{ now: new Date(minute * 60_000), offsetMs, setOffset }}>
      {children}
    </NowContext.Provider>
  );
}

export function useNow(): NowValue {
  const value = useContext(NowContext);
  if (!value) {
    throw new Error("useNow must be used inside NowProvider");
  }
  return value;
}

/** Offset that moves "now" to hours:minutes today. */
export function offsetTo(hours: number, minutes: number): number {
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  return target.getTime() - Date.now();
}
