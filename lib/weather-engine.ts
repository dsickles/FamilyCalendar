import type { DashboardConfig } from "@/lib/config";
import type { WeatherCacheIdentity } from "@/lib/weather-cache";
import type { WeatherData } from "@/lib/types/weather";

export const WEATHER_FORECAST_DAYS = 7;
export const WEATHER_FETCH_TIMEOUT_MS = 8_000;
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherFailureReason = "timeout" | "network" | "parse" | "unknown";

export type WeatherEngineResult =
  | { weather: WeatherData; reason?: undefined }
  | { weather: null; reason: WeatherFailureReason };

type OpenMeteoCurrent = {
  temperature_2m?: unknown;
  apparent_temperature?: unknown;
  weather_code?: unknown;
  wind_speed_10m?: unknown;
  relative_humidity_2m?: unknown;
  is_day?: unknown;
};

type OpenMeteoDaily = {
  time?: unknown;
  temperature_2m_max?: unknown;
  temperature_2m_min?: unknown;
  weather_code?: unknown;
  precipitation_probability_max?: unknown;
};

export function weatherCacheIdentity(
  config: DashboardConfig,
): WeatherCacheIdentity {
  return {
    latitude: config.location.latitude,
    longitude: config.location.longitude,
    timezone: config.timezone,
    temperatureUnit: config.temperatureUnit,
    windSpeedUnit: config.temperatureUnit === "celsius" ? "kmh" : "mph",
    forecastDays: WEATHER_FORECAST_DAYS,
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function failureReason(error: unknown): WeatherFailureReason {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "timeout";
  }
  if (error instanceof TypeError) {
    return "network";
  }
  return "unknown";
}

function mapDaily(daily: OpenMeteoDaily): WeatherData["daily"] | null {
  const dates = daily.time;
  const highs = daily.temperature_2m_max;
  const lows = daily.temperature_2m_min;
  const codes = daily.weather_code;
  const precip = daily.precipitation_probability_max;
  if (
    !Array.isArray(dates) ||
    !Array.isArray(highs) ||
    !Array.isArray(lows) ||
    !Array.isArray(codes) ||
    !Array.isArray(precip)
  ) {
    return null;
  }
  const length = dates.length;
  if (
    length < 3 ||
    highs.length !== length ||
    lows.length !== length ||
    codes.length !== length ||
    precip.length !== length
  ) {
    return null;
  }

  const rows: WeatherData["daily"] = [];
  for (let index = 0; index < length; index += 1) {
    const date = dates[index];
    const temperatureMax = finiteNumber(highs[index]);
    const temperatureMin = finiteNumber(lows[index]);
    const weatherCode = finiteNumber(codes[index]);
    const precipitationProbability = finiteNumber(precip[index]);
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      temperatureMax === null ||
      temperatureMin === null ||
      weatherCode === null ||
      precipitationProbability === null
    ) {
      return null;
    }
    rows.push({
      date,
      temperatureMax,
      temperatureMin,
      weatherCode,
      precipitationProbability,
    });
  }
  return rows;
}

export function mapOpenMeteoPayload(
  payload: unknown,
  fetchedAt: string,
): WeatherData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const body = payload as { current?: OpenMeteoCurrent; daily?: OpenMeteoDaily };
  const current = body.current;
  const daily = body.daily;
  if (!current || !daily) {
    return null;
  }
  const temperature = finiteNumber(current.temperature_2m);
  const apparentTemperature = finiteNumber(current.apparent_temperature);
  const weatherCode = finiteNumber(current.weather_code);
  const windSpeed = finiteNumber(current.wind_speed_10m);
  const humidity = finiteNumber(current.relative_humidity_2m);
  const isDayRaw = current.is_day;
  const isDay =
    isDayRaw === 1 || isDayRaw === true
      ? true
      : isDayRaw === 0 || isDayRaw === false
        ? false
        : null;
  const days = mapDaily(daily);
  if (
    temperature === null ||
    apparentTemperature === null ||
    weatherCode === null ||
    windSpeed === null ||
    humidity === null ||
    isDay === null ||
    !days
  ) {
    return null;
  }
  return {
    current: {
      temperature,
      apparentTemperature,
      weatherCode,
      windSpeed,
      humidity,
      isDay,
    },
    daily: days,
    fetchedAt,
  };
}

function forecastUrl(identity: WeatherCacheIdentity): URL {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(identity.latitude));
  url.searchParams.set("longitude", String(identity.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
  url.searchParams.set("temperature_unit", identity.temperatureUnit);
  url.searchParams.set("wind_speed_unit", identity.windSpeedUnit);
  url.searchParams.set("timezone", identity.timezone);
  url.searchParams.set("forecast_days", String(identity.forecastDays));
  return url;
}

export async function fetchOpenMeteoWeather(
  config: DashboardConfig,
): Promise<WeatherEngineResult> {
  const identity = weatherCacheIdentity(config);
  const url = forecastUrl(identity);
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      return { weather: null, reason: "network" };
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { weather: null, reason: "parse" };
    }
    const weather = mapOpenMeteoPayload(payload, new Date().toISOString());
    if (!weather) {
      return { weather: null, reason: "parse" };
    }
    return { weather };
  } catch (error) {
    return { weather: null, reason: failureReason(error) };
  }
}
