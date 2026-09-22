"use client";

import useSWR from "swr";
import type { WeatherApiResponse } from "@/lib/types/weather";

async function fetchWeather(url: string): Promise<WeatherApiResponse> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`);
  }
  return response.json() as Promise<WeatherApiResponse>;
}

export function useWeather() {
  return useSWR("/api/weather", fetchWeather, {
    refreshInterval: 1_800_000,
  });
}
