"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import useSWR from "swr";
import { generateDemoEvents } from "@/lib/demo-data";
import type { CalendarApiResponse } from "@/lib/types/calendar";

const CalendarPreviewContext = createContext(false);

export function CalendarPreviewProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return createElement(
    CalendarPreviewContext.Provider,
    { value: enabled },
    children,
  );
}

async function fetchCalendar(url: string): Promise<CalendarApiResponse> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Calendar request failed (${response.status})`);
  }
  return response.json() as Promise<CalendarApiResponse>;
}

export function useCalendar() {
  const preview = useContext(CalendarPreviewContext);
  const swr = useSWR(preview ? null : "/api/calendar", fetchCalendar, {
    refreshInterval: 600_000,
  });
  if (!preview) {
    return swr;
  }
  const data: CalendarApiResponse = {
    events: generateDemoEvents(),
    fetchedAt: new Date().toISOString(),
    stale: false,
    cache: "miss",
    errors: [],
  };
  return { ...swr, data, error: undefined };
}
