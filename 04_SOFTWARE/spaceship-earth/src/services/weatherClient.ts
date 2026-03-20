/**
 * @file weatherClient — Real-time weather via Open-Meteo (free, no API key).
 *
 * Defaults to SE Georgia (lat 31.0, lon -81.5) — operator's location.
 * Returns current conditions as a flat object suitable for Observatory node display.
 */

const BASE = 'https://api.open-meteo.com/v1/forecast';
const PARAMS = [
  'latitude=31.0',
  'longitude=-81.5',
  'current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m',
  'temperature_unit=fahrenheit',
  'wind_speed_unit=mph',
  'timezone=auto',
].join('&');

export interface WeatherData {
  temperature:  number;   // °F
  windSpeed:    number;   // mph
  humidity:     number;   // %
  weatherCode:  number;   // WMO code
  condition:    string;   // human-readable
  updatedAt:    number;   // Date.now()
}

const WMO_LABELS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Heavy thunderstorm',
};

export async function fetchWeather(): Promise<WeatherData> {
  const resp = await fetch(`${BASE}?${PARAMS}`);
  if (!resp.ok) throw new Error(`Weather API ${resp.status}`);
  const json = await resp.json() as {
    current: {
      temperature_2m: number;
      wind_speed_10m: number;
      weather_code:   number;
      relative_humidity_2m: number;
    };
  };
  const c = json.current;
  return {
    temperature: Math.round(c.temperature_2m),
    windSpeed:   Math.round(c.wind_speed_10m),
    humidity:    Math.round(c.relative_humidity_2m),
    weatherCode: c.weather_code,
    condition:   WMO_LABELS[c.weather_code] ?? `Code ${c.weather_code}`,
    updatedAt:   Date.now(),
  };
}
