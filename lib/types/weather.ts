export interface WeatherData {
  current: {
    temperature: number;
    apparentTemperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity: number;
    isDay: boolean;
  };
  daily: Array<{
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    weatherCode: number;
    precipitationProbability: number;
  }>;
  fetchedAt: string;
}

export interface WeatherApiResponse {
  weather: WeatherData | null;
  stale: boolean;
  cache: "hit" | "miss" | "stale";
  errors: Array<{
    reason: "timeout" | "network" | "parse" | "unknown";
  }>;
}
