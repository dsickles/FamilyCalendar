import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardConfig } from "@/lib/config";
import {
  fetchOpenMeteoWeather,
  mapOpenMeteoPayload,
  weatherCacheIdentity,
} from "@/lib/weather-engine";

const FETCHED_AT = "2026-10-20T12:00:00.000Z";

function payload() {
  return {
    current: {
      temperature_2m: 61.4,
      apparent_temperature: 59.9,
      weather_code: 2,
      wind_speed_10m: 7.2,
      relative_humidity_2m: 54,
      is_day: 1,
    },
    daily: {
      time: ["2026-10-20", "2026-10-21", "2026-10-22"],
      temperature_2m_max: [64, 58, 55],
      temperature_2m_min: [48, 44, 41],
      weather_code: [2, 61, 3],
      precipitation_probability_max: [10, 80, 20],
    },
  };
}

function config(overrides: Partial<DashboardConfig> = {}): DashboardConfig {
  return {
    location: { latitude: 40.7, longitude: -74, displayName: "Test City" },
    timezone: "America/New_York",
    locale: "en-US",
    temperatureUnit: "fahrenheit",
    timeFormat: "12h",
    weekStartDay: 0,
    idleTimeoutMs: 90_000,
    cacheRevalidateSeconds: 600,
    isDemoMode: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mapOpenMeteoPayload", () => {
  it("maps current conditions and daily rows", () => {
    const weather = mapOpenMeteoPayload(payload(), FETCHED_AT);
    expect(weather).toEqual({
      current: {
        temperature: 61.4,
        apparentTemperature: 59.9,
        weatherCode: 2,
        windSpeed: 7.2,
        humidity: 54,
        isDay: true,
      },
      daily: [
        { date: "2026-10-20", temperatureMax: 64, temperatureMin: 48, weatherCode: 2, precipitationProbability: 10 },
        { date: "2026-10-21", temperatureMax: 58, temperatureMin: 44, weatherCode: 61, precipitationProbability: 80 },
        { date: "2026-10-22", temperatureMax: 55, temperatureMin: 41, weatherCode: 3, precipitationProbability: 20 },
      ],
      fetchedAt: FETCHED_AT,
    });
  });

  it("reads is_day 0 as night", () => {
    const body = payload();
    body.current.is_day = 0;
    expect(mapOpenMeteoPayload(body, FETCHED_AT)?.current.isDay).toBe(false);
  });

  it.each([
    ["a non-object", "nope"],
    ["a missing current block", { daily: payload().daily }],
    ["a non-numeric temperature", { ...payload(), current: { ...payload().current, temperature_2m: "61" } }],
    ["fewer than 3 days", { ...payload(), daily: { ...payload().daily, time: ["2026-10-20", "2026-10-21"], temperature_2m_max: [1, 2], temperature_2m_min: [1, 2], weather_code: [1, 2], precipitation_probability_max: [1, 2] } }],
    ["mismatched daily arrays", { ...payload(), daily: { ...payload().daily, temperature_2m_max: [64, 58] } }],
    ["a malformed date", { ...payload(), daily: { ...payload().daily, time: ["10/20/2026", "2026-10-21", "2026-10-22"] } }],
  ])("returns null for %s", (_label, body) => {
    expect(mapOpenMeteoPayload(body, FETCHED_AT)).toBeNull();
  });
});

describe("weatherCacheIdentity", () => {
  it("pairs fahrenheit with mph and celsius with km/h", () => {
    expect(weatherCacheIdentity(config()).windSpeedUnit).toBe("mph");
    expect(
      weatherCacheIdentity(config({ temperatureUnit: "celsius" })).windSpeedUnit,
    ).toBe("kmh");
  });
});

describe("fetchOpenMeteoWeather", () => {
  it("requests the configured location and units", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(payload()));
    const result = await fetchOpenMeteoWeather(config());
    expect(result.weather?.current.temperature).toBe(61.4);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("40.7");
    expect(url.searchParams.get("longitude")).toBe("-74");
    expect(url.searchParams.get("temperature_unit")).toBe("fahrenheit");
    expect(url.searchParams.get("wind_speed_unit")).toBe("mph");
    expect(url.searchParams.get("timezone")).toBe("America/New_York");
  });

  it("reports an HTTP error as network", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    expect(await fetchOpenMeteoWeather(config())).toEqual({ weather: null, reason: "network" });
  });

  it("reports a bad body as parse", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not json"));
    expect(await fetchOpenMeteoWeather(config())).toEqual({ weather: null, reason: "parse" });
  });

  it("reports an incomplete payload as parse", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ current: {} }));
    expect(await fetchOpenMeteoWeather(config())).toEqual({ weather: null, reason: "parse" });
  });

  it("reports a timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );
    expect(await fetchOpenMeteoWeather(config())).toEqual({ weather: null, reason: "timeout" });
  });

  it("reports a thrown TypeError as network", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    expect(await fetchOpenMeteoWeather(config())).toEqual({ weather: null, reason: "network" });
  });
});
