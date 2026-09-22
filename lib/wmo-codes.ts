export type WeatherCodeInfo = {
  label: string;
  icon: string;
};

const UNKNOWN: WeatherCodeInfo = { label: "Unknown", icon: "Cloud" };

const CODES: Record<number, WeatherCodeInfo> = {
  0: { label: "Clear sky", icon: "Sun" },
  1: { label: "Mainly clear", icon: "Sun" },
  2: { label: "Partly cloudy", icon: "CloudSun" },
  3: { label: "Overcast", icon: "Cloud" },
  45: { label: "Fog", icon: "CloudFog" },
  48: { label: "Depositing rime fog", icon: "CloudFog" },
  51: { label: "Drizzle", icon: "CloudDrizzle" },
  53: { label: "Drizzle", icon: "CloudDrizzle" },
  55: { label: "Drizzle", icon: "CloudDrizzle" },
  56: { label: "Freezing drizzle", icon: "CloudDrizzle" },
  57: { label: "Freezing drizzle", icon: "CloudDrizzle" },
  61: { label: "Rain", icon: "CloudRain" },
  63: { label: "Rain", icon: "CloudRain" },
  65: { label: "Rain", icon: "CloudRain" },
  66: { label: "Freezing rain", icon: "CloudRain" },
  67: { label: "Freezing rain", icon: "CloudRain" },
  71: { label: "Snow", icon: "CloudSnow" },
  73: { label: "Snow", icon: "CloudSnow" },
  75: { label: "Snow", icon: "CloudSnow" },
  77: { label: "Snow grains", icon: "CloudSnow" },
  80: { label: "Rain showers", icon: "CloudRain" },
  81: { label: "Rain showers", icon: "CloudRain" },
  82: { label: "Rain showers", icon: "CloudRain" },
  85: { label: "Snow showers", icon: "CloudSnow" },
  86: { label: "Snow showers", icon: "CloudSnow" },
  95: { label: "Thunderstorm", icon: "CloudLightning" },
  96: { label: "Thunderstorm with hail", icon: "CloudLightning" },
  99: { label: "Thunderstorm with hail", icon: "CloudLightning" },
};

export function describeWeatherCode(code: number): WeatherCodeInfo {
  if (!Number.isInteger(code)) {
    return UNKNOWN;
  }
  return CODES[code] ?? UNKNOWN;
}
