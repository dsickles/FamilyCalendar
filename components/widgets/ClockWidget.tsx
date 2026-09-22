"use client";

import { useEffect, useState } from "react";
import { formatTime, type TimeFormat } from "@/lib/date-utils";

type ClockWidgetProps = {
  timezone: string;
  timeFormat: TimeFormat;
};

function formatDateLine(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(date);
}

function stampKey(date: Date, timeFormat: TimeFormat, timezone: string): string {
  return `${formatTime(date, timeFormat, timezone)}|${formatDateLine(date, timezone)}`;
}

export default function ClockWidget({ timezone, timeFormat }: ClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let frame = 0;
    let lastKey = "";

    const tick = () => {
      const date = new Date();
      const key = stampKey(date, timeFormat, timezone);
      if (key !== lastKey) {
        lastKey = key;
        setNow(date);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timezone, timeFormat]);

  if (!now) {
    return <div className="min-h-24" aria-hidden />;
  }

  return (
    <div>
      <p className="text-5xl font-light tracking-tight text-text-primary tabular-nums">
        {formatTime(now, timeFormat, timezone)}
      </p>
      <p className="mt-1 text-lg text-text-secondary">
        {formatDateLine(now, timezone)}
      </p>
    </div>
  );
}
