"use client";

import {
  IconCloud,
  IconCloudBolt,
  IconCloudFog,
  IconCloudRain,
  IconCloudSnow,
  IconMoon,
  IconMoonStars,
  IconSun,
} from "@tabler/icons-react";
import { useWeather } from "@/lib/hooks/useWeather";
import type { WeatherData } from "@/lib/types/weather";
import { describeWeatherCode } from "@/lib/wmo-codes";

type TemperatureUnit = "fahrenheit" | "celsius";

type WeatherWidgetProps = {
  timezone: string;
  temperatureUnit: TemperatureUnit;
  locationName: string;
};

type WeatherIcon = typeof IconCloud;

const ICONS: Record<string, WeatherIcon> = {
  Sun: IconSun,
  Moon: IconMoon,
  CloudSun: IconCloud,
  CloudMoon: IconMoonStars,
  Cloud: IconCloud,
  CloudFog: IconCloudFog,
  CloudDrizzle: IconCloudRain,
  CloudRain: IconCloudRain,
  CloudSnow: IconCloudSnow,
  CloudLightning: IconCloudBolt,
};

function resolveIcon(name: string, isDay: boolean): WeatherIcon {
  const swapped =
    !isDay && name === "Sun"
      ? "Moon"
      : !isDay && name === "CloudSun"
        ? "CloudMoon"
        : name;
  return ICONS[swapped] ?? IconCloud;
}

function weekdayShort(ymd: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    return ymd;
  }
  const instant = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(instant);
}

function unitSuffix(unit: TemperatureUnit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export default function WeatherWidget({
  timezone,
  temperatureUnit,
  locationName,
}: WeatherWidgetProps) {
  const { data, error } = useWeather();
  const weather = data?.weather ?? null;
  const loading = data === undefined && !error;
  const unavailable = Boolean(error) || (data !== undefined && weather === null);

  return (
    <section aria-label="Weather" className="flex items-center justify-end">
      {loading ? <div className="h-12 w-40" aria-hidden /> : null}
      {unavailable ? (
        <p className="text-sm text-text-muted">Weather unavailable</p>
      ) : null}
      {weather ? (
        <CurrentConditions
          weather={weather}
          timezone={timezone}
          temperatureUnit={temperatureUnit}
          locationName={locationName}
        />
      ) : null}
    </section>
  );
}

function CurrentConditions({
  weather,
  timezone,
  temperatureUnit,
  locationName,
}: {
  weather: WeatherData;
  timezone: string;
  temperatureUnit: TemperatureUnit;
  locationName: string;
}) {
  const described = describeWeatherCode(weather.current.weatherCode);
  const CurrentIcon = resolveIcon(described.icon, weather.current.isDay);
  const days = weather.daily.slice(0, 3);
  const suffix = unitSuffix(temperatureUnit);

  return (
    <div className="flex items-center gap-5 whitespace-nowrap">
      <div className="text-right">
        <p className="text-sm text-text-secondary">{locationName}</p>
        <p className="text-sm text-text-secondary">{described.label}</p>
      </div>
      <p className="text-3xl font-light text-text-primary tabular-nums">
        {Math.round(weather.current.temperature)}
        {suffix}
      </p>
      <CurrentIcon size={22} stroke={1.5} className="text-text-secondary" aria-hidden />
      {days.length > 0 ? (
        <ul className="flex items-center gap-4 border-l border-border pl-5">
          {days.map((day) => {
            const dayInfo = describeWeatherCode(day.weatherCode);
            const DayIcon = resolveIcon(dayInfo.icon, true);
            return (
              <li key={day.date} className="flex flex-col items-center gap-0.5">
                <span className="text-xs leading-none text-text-secondary">
                  {weekdayShort(day.date, timezone)}
                </span>
                <DayIcon size={16} stroke={1.5} className="text-text-secondary" aria-hidden />
                <span className="text-xs leading-none text-text-secondary tabular-nums">
                  {Math.round(day.temperatureMax)}°/{Math.round(day.temperatureMin)}°
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
