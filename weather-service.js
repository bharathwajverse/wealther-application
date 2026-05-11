/* =====================================================
   ATMOSPHÈRE WEATHER — weather-service.js
   ES6 Class for API calls (JS Module VIII — Classes)
   Demonstrates: class, constructor, async methods,
   static methods, Promise handling, fetch API
===================================================== */

import { AC_MAX_RESULTS, FORECAST_DAYS } from "./utils.js";

/**
 * WeatherService — handles all API communication with Open-Meteo.
 * Encapsulates geocoding and forecast fetching in a single class.
 */
export class WeatherService {
  // Static property — base URLs (shared across all instances)
  static GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";
  static FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";

  /**
   * @param {Object} options
   * @param {number} options.forecastDays - Number of forecast days
   * @param {number} options.acMaxResults - Max autocomplete results
   */
  constructor({ forecastDays = FORECAST_DAYS, acMaxResults = AC_MAX_RESULTS } = {}) {
    this.forecastDays = forecastDays;
    this.acMaxResults = acMaxResults;
    this._cache = new Map(); // Simple cache for recent lookups
  }

  /**
   * Search for cities by name (Geocoding API).
   * Returns an array of location objects.
   * @param {string} query - City name to search
   * @param {number} count - Number of results
   * @returns {Promise<Array>}
   */
  async searchCity(query, count = 1) {
    const url = `${WeatherService.GEO_BASE}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;

    // Using .then().catch() pattern (Module VIII — Promises)
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results?.length) {
      throw new Error("City not found");
    }

    return data.results;
  }

  /**
   * Fetch autocomplete suggestions.
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async fetchAutocomplete(query) {
    try {
      const results = await this.searchCity(query, this.acMaxResults);
      return results;
    } catch (_) {
      return [];
    }
  }

  /**
   * Fetch full weather forecast by coordinates.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<Object>}
   */
  async fetchForecast(lat, lon) {
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

    // Check cache (valid for 5 minutes)
    if (this._cache.has(cacheKey)) {
      const cached = this._cache.get(cacheKey);
      const age = Date.now() - cached.timestamp;
      if (age < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    const url =
      `${WeatherService.FORECAST_BASE}` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day` +
      `&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,wind_speed_10m,visibility,apparent_temperature` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,apparent_temperature_max` +
      `&timezone=auto&forecast_days=${this.forecastDays}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Forecast fetch failed");
    }

    const data = await response.json();

    // Cache the result
    this._cache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
  }

  /**
   * Static factory method — alternative constructor pattern (Module VI)
   * @param {Object} config
   * @returns {WeatherService}
   */
  static create(config) {
    return new WeatherService(config);
  }

  /**
   * Clear the internal cache
   */
  clearCache() {
    this._cache.clear();
  }
}
