const axios = require('axios');
const connection = require('../config/database');

const WEATHER_CACHE_MS = 30 * 60 * 1000;
const DISTRICT_COORDS = {
  Ampara: { lat: 7.3025, lon: 81.6747 },
  Anuradhapura: { lat: 8.3114, lon: 80.4037 },
  Badulla: { lat: 6.9898, lon: 81.055 },
  Batticaloa: { lat: 7.7102, lon: 81.6924 },
  Colombo: { lat: 6.9271, lon: 79.8612 },
  Galle: { lat: 6.0535, lon: 80.221 },
  Gampaha: { lat: 7.084, lon: 79.9994 },
  Hambantota: { lat: 6.1248, lon: 81.1185 },
  Jaffna: { lat: 9.6615, lon: 80.0255 },
  Kalutara: { lat: 6.5854, lon: 79.9607 },
  Kandy: { lat: 7.2906, lon: 80.6337 },
  Kegalle: { lat: 7.2513, lon: 80.3464 },
  Kilinochchi: { lat: 9.3961, lon: 80.3982 },
  Kurunegala: { lat: 7.4863, lon: 80.3647 },
  Mannar: { lat: 8.9768, lon: 79.9045 },
  Matale: { lat: 7.4675, lon: 80.6234 },
  Matara: { lat: 5.9549, lon: 80.5353 },
  Monaragala: { lat: 6.8721, lon: 81.3492 },
  Mullaitivu: { lat: 9.2671, lon: 80.8144 },
  'Nuwara Eliya': { lat: 6.9497, lon: 80.7891 },
  Polonnaruwa: { lat: 7.9339, lon: 81.0028 },
  Puttalam: { lat: 8.0362, lon: 79.8283 },
  Ratnapura: { lat: 6.6828, lon: 80.3992 },
  Trincomalee: { lat: 8.5874, lon: 81.2152 },
  Vavuniya: { lat: 8.7514, lon: 80.4971 },
};

const weatherCache = new Map();

function getDistrictMeta(district) {
  if (!district) return null;
  const name = String(district).trim();
  return DISTRICT_COORDS[name] ? { district: name, ...DISTRICT_COORDS[name] } : null;
}

function getPreferredSeason(date) {
  const now = new Date(date);
  const month = now.getMonth() + 1;
  return month >= 10 || month <= 3 ? 'Maha' : 'Yala';
}

function getWeatherWindowFromForecast(forecastList) {
  if (!Array.isArray(forecastList) || forecastList.length === 0) {
    return { next24hRain: 0, next5dRain: 0, minTemp: null, maxTemp: null };
  }

  const now = Date.now();
  const next24h = forecastList.filter((item) => {
    const timestamp = item.dt * 1000;
    return timestamp >= now && timestamp <= now + 24 * 60 * 60 * 1000;
  });

  const next5d = forecastList.filter((item) => {
    const timestamp = item.dt * 1000;
    return timestamp >= now && timestamp <= now + 5 * 24 * 60 * 60 * 1000;
  });

  const next24hRain = next24h.reduce((sum, item) => sum + Number(item.rain?.['3h'] || 0), 0);
  const next5dRain = next5d.reduce((sum, item) => sum + Number(item.rain?.['3h'] || 0), 0);
  const temps = forecastList.map((item) => Number(item.main?.temp ?? 0)).filter((item) => Number.isFinite(item));

  return {
    next24hRain,
    next5dRain,
    minTemp: temps.length ? Math.min(...temps) : null,
    maxTemp: temps.length ? Math.max(...temps) : null,
  };
}

async function fetchClimateNormals(district) {
  const meta = getDistrictMeta(district);
  if (!meta) return [];

  try {
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude: meta.lat,
        longitude: meta.lon,
        start_date: '2015-01-01',
        end_date: '2024-12-31',
        daily: 'temperature_2m_mean,rain_sum',
        timezone: 'auto',
      },
      timeout: 10000,
    });

    const daily = response.data?.daily || {};
    const times = daily.time || [];
    const temps = daily.temperature_2m_mean || [];
    const rains = daily.rain_sum || [];

    const monthMap = new Map();
    times.forEach((dateString, index) => {
      const month = new Date(dateString).getMonth() + 1;
      if (!monthMap.has(month)) {
        monthMap.set(month, { totalTemp: 0, totalRain: 0, count: 0 });
      }
      const bucket = monthMap.get(month);
      bucket.totalTemp += Number(temps[index] || 0);
      bucket.totalRain += Number(rains[index] || 0);
      bucket.count += 1;
    });

    return Array.from(monthMap.entries()).map(([month, bucket]) => ({
      month,
      avgTemp: bucket.count ? bucket.totalTemp / bucket.count : null,
      avgRainfallMm: bucket.count ? bucket.totalRain / bucket.count : null,
    }));
  } catch (error) {
    return [];
  }
}

async function writeWeatherLog(district, payload) {
  try {
    if (!connection || !connection.query) return;
    await connection.promise().query(
      `INSERT INTO weather_logs (district, temperature, humidity, rainfall_24h, forecast_json, stale, source) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        district,
        payload.temperature,
        payload.humidity,
        payload.rainfall24h,
        JSON.stringify(payload.forecast || []),
        payload.stale ? 1 : 0,
        payload.source || 'OpenWeatherMap',
      ]
    );
  } catch (error) {
    // silent failure
  }
}

async function getLatestWeatherLog(district) {
  try {
    if (!connection || !connection.query) return null;
    const [rows] = await connection.promise().query(
      'SELECT * FROM weather_logs WHERE district = ? ORDER BY fetched_at DESC LIMIT 1',
      [district]
    );
    return rows && rows.length ? rows[0] : null;
  } catch (error) {
    return null;
  }
}

async function getWeatherForDistrict(district) {
  const districtName = String(district || '').trim();
  const meta = getDistrictMeta(districtName);
  if (!meta) {
    return {
      success: false,
      stale: false,
      message: 'Invalid Sri Lankan district.',
      district: districtName,
      weather: null,
    };
  }

  const cacheKey = districtName;
  const now = Date.now();
  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.timestamp < WEATHER_CACHE_MS) {
    return cached.payload;
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        stale: false,
        message: 'Weather API key is not configured.',
        district: districtName,
        weather: null,
      };
    }

    const [currentResponse, forecastResponse] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: meta.lat,
          lon: meta.lon,
          appid: apiKey,
          units: 'metric',
        },
        timeout: 10000,
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat: meta.lat,
          lon: meta.lon,
          appid: apiKey,
          units: 'metric',
          cnt: 40,
        },
        timeout: 10000,
      }),
    ]);

    const current = currentResponse.data;
    const forecast = forecastResponse.data?.list || [];
    const currentRain = Number(current.rain?.['1h'] || current.rain?.['3h'] || 0);
    const window = getWeatherWindowFromForecast(forecast);
    const climateNormals = await fetchClimateNormals(districtName);

    const weatherPayload = {
      success: true,
      stale: false,
      message: 'Weather refreshed successfully.',
      district: districtName,
      weather: {
        location: current.name || districtName,
        temperature: Number(current.main?.temp ?? 0),
        feels_like: Number(current.main?.feels_like ?? 0),
        humidity: Number(current.main?.humidity ?? 0),
        pressure: Number(current.main?.pressure ?? 0),
        wind_speed: Number(current.wind?.speed ?? 0),
        description: current.weather?.[0]?.description || 'Current conditions',
        icon: current.weather?.[0]?.icon || '02d',
        rainfall_24h: Number(currentRain) || window.next24hRain,
        rainfall_5day_mm: Number(window.next5dRain),
        min_temp_5day: window.minTemp,
        max_temp_5day: window.maxTemp,
        season: getPreferredSeason(new Date()),
        forecast: forecast.slice(0, 10).map((entry) => ({
          dt: entry.dt,
          date: new Date(entry.dt * 1000).toISOString(),
          temperature: Number(entry.main?.temp ?? 0),
          humidity: Number(entry.main?.humidity ?? 0),
          rainfall: Number(entry.rain?.['3h'] || 0),
          description: entry.weather?.[0]?.description || 'Forecast',
        })),
        climate_normals: climateNormals,
      },
    };

    await writeWeatherLog(districtName, {
      temperature: weatherPayload.weather.temperature,
      humidity: weatherPayload.weather.humidity,
      rainfall24h: weatherPayload.weather.rainfall_24h,
      forecast: weatherPayload.weather.forecast,
      stale: false,
      source: 'OpenWeatherMap + Open-Meteo',
    });

    weatherCache.set(cacheKey, { timestamp: now, payload: weatherPayload });
    return weatherPayload;
  } catch (error) {
    const lastWeather = await getLatestWeatherLog(districtName);
    const stalePayload = {
      success: false,
      stale: true,
      message: 'Weather data is temporarily unavailable. Using the latest stored reading from the system.',
      district: districtName,
      weather: lastWeather
        ? {
            location: districtName,
            temperature: Number(lastWeather.temperature || 0),
            humidity: Number(lastWeather.humidity || 0),
            rainfall_24h: Number(lastWeather.rainfall_24h || 0),
            forecast: lastWeather.forecast_json || [],
            stale: true,
          }
        : null,
    };

    weatherCache.set(cacheKey, { timestamp: now, payload: stalePayload });
    return stalePayload;
  }
}

module.exports = {
  getWeatherForDistrict,
  getDistrictMeta,
  getPreferredSeason,
  allowedDistricts: Object.keys(DISTRICT_COORDS),
};
