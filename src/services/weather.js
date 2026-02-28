// Weather & Marine data service
// Uses Open-Meteo API (completely free, no API key needed)

// Simple in-memory cache to avoid hammering the API
const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function getCacheKey(lat, lng, days) {
  // Round coordinates to 2 decimals for cache hits on nearby locations
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${days}`;
}

async function getWeatherForecast(lat, lng, days = 7) {
  const key = `weather_${getCacheKey(lat, lng, days)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'precipitation_probability_max',
      'windspeed_10m_max', 'winddirection_10m_dominant',
      'uv_index_max', 'sunrise', 'sunset',
      'weathercode'
    ].join(','),
    forecast_days: days,
    timezone: 'Europe/Zagreb',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();

  cache.set(key, { data, time: Date.now() });
  return data;
}

async function getMarineForecast(lat, lng, days = 7) {
  const key = `marine_${getCacheKey(lat, lng, days)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: [
      'wave_height_max', 'wave_direction_dominant', 'wave_period_max',
      'wind_wave_height_max', 'swell_wave_height_max'
    ].join(','),
    forecast_days: days,
    timezone: 'Europe/Zagreb',
  });

  const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?${params}`);
  if (!res.ok) throw new Error(`Marine API error: ${res.status}`);
  const data = await res.json();

  cache.set(key, { data, time: Date.now() });
  return data;
}

// Combine weather + marine into a clean daily forecast
async function getCombinedForecast(lat, lng, days = 7) {
  const [weather, marine] = await Promise.all([
    getWeatherForecast(lat, lng, days),
    getMarineForecast(lat, lng, days).catch(() => null), // Marine may fail for inland locations
  ]);

  const forecasts = [];
  const d = weather.daily;

  for (let i = 0; i < days; i++) {
    const windKmh = d.windspeed_10m_max?.[i] || 0;
    const forecast = {
      date: d.time?.[i],
      temp_max: d.temperature_2m_max?.[i],
      temp_min: d.temperature_2m_min?.[i],
      precipitation_mm: d.precipitation_sum?.[i],
      precipitation_probability: d.precipitation_probability_max?.[i],
      wind_max_kmh: windKmh,
      wind_max_knots: Math.round(windKmh * 0.5399568),
      wind_direction_deg: d.winddirection_10m_dominant?.[i],
      wind_direction: degreesToCompass(d.winddirection_10m_dominant?.[i]),
      uv_index: d.uv_index_max?.[i],
      sunrise: d.sunrise?.[i],
      sunset: d.sunset?.[i],
      weather_code: d.weathercode?.[i],
      condition: weatherCodeToText(d.weathercode?.[i]),
    };

    // Add marine data if available
    if (marine?.daily) {
      forecast.wave_height = marine.daily.wave_height_max?.[i];
      forecast.wave_direction = marine.daily.wave_direction_dominant?.[i];
      forecast.wave_period = marine.daily.wave_period_max?.[i];
      forecast.swell_height = marine.daily.swell_wave_height_max?.[i];
    }

    // Sailing safety assessment
    forecast.sailing_safety = assessSailingSafety(forecast);

    forecasts.push(forecast);
  }

  return forecasts;
}

function degreesToCompass(deg) {
  if (deg == null) return 'N/A';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function weatherCodeToText(code) {
  const codes = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Light showers', 81: 'Moderate showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
  };
  return codes[code] || 'Unknown';
}

function assessSailingSafety(forecast) {
  const wind = forecast.wind_max_knots;
  const waves = forecast.wave_height || 0;

  if (wind > 30 || waves > 3.0) return { level: 'dangerous', label: '⛔ Do not sail', color: '#dc2626' };
  if (wind > 25 || waves > 2.5) return { level: 'warning', label: '⚠️ Experienced only', color: '#f59e0b' };
  if (wind > 20 || waves > 1.5) return { level: 'moderate', label: '🟡 Moderate conditions', color: '#eab308' };
  if (wind > 15 || waves > 1.0) return { level: 'fair', label: '🟢 Good sailing', color: '#22c55e' };
  return { level: 'excellent', label: '✅ Perfect conditions', color: '#10b981' };
}

module.exports = { getCombinedForecast, getWeatherForecast, getMarineForecast };
