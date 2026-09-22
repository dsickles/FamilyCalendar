import { NextResponse } from "next/server";
import { getDashboardConfig } from "@/lib/config";
import type { DashboardConfig } from "@/lib/config";
import {
  buildWeatherCacheKey,
  getStaleWeatherCache,
  getWeatherCache,
  setWeatherCache,
} from "@/lib/weather-cache";
import { fetchOpenMeteoWeather, weatherCacheIdentity } from "@/lib/weather-engine";
import type { WeatherApiResponse } from "@/lib/types/weather";
import { describeWeatherCode } from "@/lib/wmo-codes";

const WEATHER_TTL_SECONDS = 1800;

function logCache(state: WeatherApiResponse["cache"]): void {
  console.info(`weather-cache ${state.toUpperCase()}`);
}

function cacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "s-maxage=1800, stale-while-revalidate=600",
  };
}

function wantsBrowserHtml(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    return false;
  }
  const htmlAt = accept.indexOf("text/html");
  const jsonAt = accept.indexOf("application/json");
  return jsonAt === -1 || htmlAt < jsonAt;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonResponse(body: WeatherApiResponse): NextResponse {
  return NextResponse.json(body, {
    status: 200,
    headers: cacheHeaders(),
  });
}

function temperatureUnitSymbol(unit: DashboardConfig["temperatureUnit"]): string {
  return unit === "celsius" ? "°C" : "°F";
}

function windUnitLabel(unit: DashboardConfig["temperatureUnit"]): string {
  return unit === "celsius" ? "km/h" : "mph";
}

function formatTemp(value: number, unit: DashboardConfig["temperatureUnit"]): string {
  return `${Math.round(value)}${temperatureUnitSymbol(unit)}`;
}

function formatDay(ymd: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    return ymd;
  }
  const instant = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(instant);
  return `${weekday} ${ymd}`;
}

function htmlResponse(
  body: WeatherApiResponse,
  config: DashboardConfig,
): NextResponse {
  const unit = config.temperatureUnit;
  const windUnit = windUnitLabel(unit);
  const place = escapeHtml(config.location.displayName);
  const status = body.stale
    ? "Showing the last known forecast."
    : body.weather
      ? `Updated ${body.weather.fetchedAt}`
      : "Forecast unavailable.";

  let content: string;
  if (!body.weather) {
    const reason = body.errors[0]?.reason ?? "unknown";
    content = `<h1>${place}</h1>
    <p class="meta">${escapeHtml(status)}</p>
    <p>Open-Meteo did not return a forecast (${escapeHtml(reason)}).</p>`;
  } else {
    const current = body.weather.current;
    const condition = escapeHtml(describeWeatherCode(current.weatherCode).label);
    const rows = body.weather.daily
      .map((day) => {
        const label = escapeHtml(describeWeatherCode(day.weatherCode).label);
        return `<tr>
          <td>${escapeHtml(formatDay(day.date, config.timezone))}</td>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(formatTemp(day.temperatureMax, unit))}</td>
          <td>${escapeHtml(formatTemp(day.temperatureMin, unit))}</td>
          <td>${escapeHtml(String(Math.round(day.precipitationProbability)))}%</td>
        </tr>`;
      })
      .join("");
    content = `<h1>${place}</h1>
    <p class="temp">${escapeHtml(formatTemp(current.temperature, unit))}</p>
    <p class="condition">${condition}</p>
    <ul>
      <li>Feels like ${escapeHtml(formatTemp(current.apparentTemperature, unit))}</li>
      <li>Humidity ${escapeHtml(String(Math.round(current.humidity)))}%</li>
      <li>Wind ${escapeHtml(String(Math.round(current.windSpeed)))} ${escapeHtml(windUnit)}</li>
    </ul>
    <p class="meta">${escapeHtml(status)} · cache ${escapeHtml(body.cache)}</p>
    <h2>Daily forecast</h2>
    <table>
      <thead>
        <tr><th>Date</th><th>Conditions</th><th>High</th><th>Low</th><th>Precip</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Weather · ${place}</title>
  <style>
    html, body {
      margin: 0;
      background: #f4f4f5;
      color: #111827;
      color-scheme: light;
      font: 16px/1.45 system-ui, sans-serif;
    }
    main { max-width: 720px; padding: 24px; }
    h1 { font-size: 28px; margin: 0; }
    h2 { font-size: 18px; margin: 24px 0 8px; }
    .temp { font-size: 56px; font-weight: 600; margin: 8px 0 0; }
    .condition { font-size: 20px; margin: 0 0 12px; }
    .meta { color: #374151; }
    ul { margin: 0; padding-left: 18px; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      color: #111827;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #e4e4e7;
    }
  </style>
</head>
<body>
  <main>
    ${content}
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      ...cacheHeaders(),
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function respond(
  request: Request,
  body: WeatherApiResponse,
  config: DashboardConfig,
): NextResponse {
  return wantsBrowserHtml(request)
    ? htmlResponse(body, config)
    : jsonResponse(body);
}

export async function GET(request: Request) {
  const config = getDashboardConfig();
  const cacheKey = buildWeatherCacheKey(weatherCacheIdentity(config));

  const fresh = getWeatherCache(cacheKey);
  if (fresh) {
    logCache("hit");
    return respond(
      request,
      { weather: fresh, stale: false, cache: "hit", errors: [] },
      config,
    );
  }

  const result = await fetchOpenMeteoWeather(config);
  if (result.weather) {
    setWeatherCache(cacheKey, result.weather, WEATHER_TTL_SECONDS);
    logCache("miss");
    return respond(
      request,
      {
        weather: result.weather,
        stale: false,
        cache: "miss",
        errors: [],
      },
      config,
    );
  }

  const stale = getStaleWeatherCache(cacheKey);
  if (stale) {
    logCache("stale");
    return respond(
      request,
      {
        weather: stale,
        stale: true,
        cache: "stale",
        errors: [{ reason: result.reason }],
      },
      config,
    );
  }

  logCache("miss");
  return respond(
    request,
    {
      weather: null,
      stale: false,
      cache: "miss",
      errors: [{ reason: result.reason }],
    },
    config,
    );
}
