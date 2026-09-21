export interface CalendarSource {
  id: string;
  label: string;
  icsUrl: string;
  color: string;
  icon?: string;
  enabled: boolean;
  category: "person" | "shared" | "utility" | "external";
}

export interface DashboardConfig {
  location: {
    latitude: number;
    longitude: number;
    displayName: string;
  };
  timezone: string;
  locale: string;
  temperatureUnit: "fahrenheit" | "celsius";
  timeFormat: "12h" | "24h";
  weekStartDay: 0 | 1;
  idleTimeoutMs: number;
  cacheRevalidateSeconds: number;
  isDemoMode: boolean;
}

const CAL_URL_PATTERN = /^CAL_([A-Z0-9]+)_URL$/;
const DEFAULT_COLORS: Record<string, string> = {
  PERSONAL: "#6366f1",
  SPOUSE: "#ec4899",
  FAMILY: "#10b981",
  WASTE: "#64748b",
  HOLIDAYS: "#ef4444",
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function documentedCalendarUrls(): Array<string | undefined> {
  return [
    process.env.CAL_PERSONAL_URL,
    process.env.CAL_SPOUSE_URL,
    process.env.CAL_FAMILY_URL,
    process.env.CAL_WASTE_URL,
    process.env.CAL_HOLIDAYS_URL,
    process.env.DASHBOARD_PIN,
  ];
}

function calendarCategory(
  value: string | undefined,
): CalendarSource["category"] {
  if (
    value === "person" ||
    value === "shared" ||
    value === "utility" ||
    value === "external"
  ) {
    return value;
  }
  return "person";
}

export function getCalendarSources(): CalendarSource[] {
  documentedCalendarUrls();
  const ids = new Set<string>([
    "PERSONAL",
    "SPOUSE",
    "FAMILY",
    "WASTE",
    "HOLIDAYS",
  ]);
  for (const key of Object.keys(process.env)) {
    const match = CAL_URL_PATTERN.exec(key);
    if (match) {
      ids.add(match[1]);
    }
  }

  return [...ids]
    .sort()
    .map((slug) => {
      const icsUrl = env(`CAL_${slug}_URL`) ?? "";
      return {
        id: slug.toLowerCase(),
        label: env(`CAL_${slug}_LABEL`) ?? slug.toLowerCase(),
        icsUrl,
        color: env(`CAL_${slug}_COLOR`) ?? DEFAULT_COLORS[slug] ?? "#6366f1",
        icon: env(`CAL_${slug}_ICON`),
        enabled: icsUrl.length > 0,
        category: calendarCategory(env(`CAL_${slug}_CATEGORY`)),
      };
    });
}

export function isDemoMode(): boolean {
  const documented = documentedCalendarUrls().slice(0, 5);
  if (documented.some((value) => Boolean(value && value.trim()))) {
    return false;
  }
  return getCalendarSources().every((source) => !source.enabled);
}

export function getDashboardConfig(): DashboardConfig {
  const weekStart = env("WEEK_START_DAY");
  return {
    location: {
      latitude: Number(env("WEATHER_LAT") ?? 40.9892),
      longitude: Number(env("WEATHER_LON") ?? -73.7944),
      displayName: env("WEATHER_DISPLAY_NAME") ?? "Scarsdale, NY",
    },
    timezone: env("TIMEZONE") ?? "America/New_York",
    locale: "en-US",
    temperatureUnit:
      env("TEMPERATURE_UNIT") === "celsius" ? "celsius" : "fahrenheit",
    timeFormat: env("TIME_FORMAT") === "24h" ? "24h" : "12h",
    weekStartDay: weekStart === "1" ? 1 : 0,
    idleTimeoutMs: Number(env("IDLE_TIMEOUT_MS") ?? 90_000),
    cacheRevalidateSeconds: Number(env("CACHE_REVALIDATE_SECONDS") ?? 600),
    isDemoMode: isDemoMode(),
  };
}
