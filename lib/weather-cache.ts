import { createHash } from "node:crypto";
import type { WeatherData } from "@/lib/types/weather";

const DEFAULT_TTL_SECONDS = 1800;

type CacheEntry = {
  data: WeatherData;
  expiresAt: number;
};

export type WeatherCacheIdentity = {
  latitude: number;
  longitude: number;
  timezone: string;
  temperatureUnit: string;
  windSpeedUnit: string;
  forecastDays: number;
};

const globalForCache = globalThis as typeof globalThis & {
  __weatherCache?: Map<string, CacheEntry>;
};

const store =
  globalForCache.__weatherCache ??
  (globalForCache.__weatherCache = new Map<string, CacheEntry>());

function nowMs(): number {
  return Date.now();
}

function pruneExpired(keepKey?: string): void {
  const now = nowMs();
  for (const [key, entry] of store) {
    if (key === keepKey) {
      continue;
    }
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function buildWeatherCacheKey(identity: WeatherCacheIdentity): string {
  return createHash("sha256")
    .update(String(identity.latitude))
    .update("\n")
    .update(String(identity.longitude))
    .update("\n")
    .update(identity.timezone)
    .update("\n")
    .update(identity.temperatureUnit)
    .update("\n")
    .update(identity.windSpeedUnit)
    .update("\n")
    .update(String(identity.forecastDays))
    .digest("hex");
}

export function getWeatherCache(key: string): WeatherData | null {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= nowMs()) {
    return null;
  }
  pruneExpired(key);
  return entry.data;
}

export function getStaleWeatherCache(key: string): WeatherData | null {
  const entry = store.get(key);
  return entry ? entry.data : null;
}

export function setWeatherCache(
  key: string,
  data: WeatherData,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): void {
  pruneExpired();
  const ttl =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0
      ? ttlSeconds
      : DEFAULT_TTL_SECONDS;
  store.set(key, {
    data,
    expiresAt: nowMs() + ttl * 1000,
  });
}

export function invalidateWeatherCache(key?: string): void {
  if (key) {
    store.delete(key);
    return;
  }
  store.clear();
}
