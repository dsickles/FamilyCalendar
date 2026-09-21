import { createHash } from "node:crypto";
import { getDashboardConfig } from "@/lib/config";
import type { UnifiedEvent } from "@/lib/types/calendar";

type CacheEntry = {
  data: UnifiedEvent[];
  expiresAt: number;
};

const globalForCache = globalThis as typeof globalThis & {
  __calendarEventCache?: Map<string, CacheEntry>;
};

const store =
  globalForCache.__calendarEventCache ??
  (globalForCache.__calendarEventCache = new Map<string, CacheEntry>());

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

export function buildCalendarCacheKey(
  sources: Array<{ id: string; icsUrl: string }>,
  windowStart: Date,
  windowEnd: Date,
): string {
  const identity = sources
    .map((source) => `${source.id}\0${source.icsUrl}`)
    .sort()
    .join("\n");
  return createHash("sha256")
    .update(identity)
    .update("\n")
    .update(windowStart.toISOString())
    .update("\n")
    .update(windowEnd.toISOString())
    .digest("hex");
}

export function getCalendarCache(key: string): UnifiedEvent[] | null {
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

export function getStaleCalendarCache(key: string): UnifiedEvent[] | null {
  const entry = store.get(key);
  return entry ? entry.data : null;
}

export function setCalendarCache(
  key: string,
  data: UnifiedEvent[],
  ttlSeconds = getDashboardConfig().cacheRevalidateSeconds,
): void {
  pruneExpired();
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 600;
  store.set(key, {
    data,
    expiresAt: nowMs() + ttl * 1000,
  });
}

export function invalidateCalendarCache(key?: string): void {
  if (key) {
    store.delete(key);
    return;
  }
  store.clear();
}
