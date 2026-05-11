/* =====================================================
   ATMOSPHÈRE WEATHER — utils.js
   Named constants, helper functions, weather code maps
   Demonstrates: const, switch, arrow functions, exports
===================================================== */

// ── NAMED CONSTANTS (replaces magic numbers) ──
export const TEMP_HOT = 33;
export const TEMP_WARM = 30;
export const TEMP_MILD = 20;
export const TEMP_COOL = 12;
export const TEMP_COLD = 10;
export const TEMP_FREEZING = 3;
export const TEMP_EXTREME_HOT = 37;

export const HUMIDITY_HIGH = 70;
export const HUMIDITY_COMFORTABLE_HIGH = 75;
export const HUMIDITY_STICKY = 80;
export const HUMIDITY_LOW = 40;
export const HUMIDITY_DRY = 35;

export const UV_LOW = 3;
export const UV_MODERATE = 6;
export const UV_HIGH = 8;
export const UV_MAX_SCALE = 12;

export const PRECIP_LIKELY = 70;
export const PRECIP_MODERATE = 40;
export const PRECIP_LOW = 35;
export const PRECIP_WASH_RISK = 60;
export const PRECIP_WASH_LOW = 30;

export const WIND_STRONG = 45;

export const VISIBILITY_EXCELLENT_KM = 10;
export const VISIBILITY_GOOD_KM = 5;

export const AC_MIN_CHARS = 2;
export const AC_DEBOUNCE_MS = 300;
export const AC_MAX_RESULTS = 5;
export const TOAST_DURATION_MS = 3000;
export const FORECAST_DAYS = 7;
export const HOURLY_COUNT = 24;

export const STORAGE_KEY_UNIT = "atmosphere_unit";
export const STORAGE_KEY_CITY = "atmosphere_last_city";

// ── COMPASS DIRECTIONS ──
const COMPASS_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

// ── WEATHER CODE → TEXT (using switch — Module VIII) ──
export function codeToText(code) {
  switch (true) {
    case code === 0: return "Clear sky";
    case code === 1: return "Mainly clear";
    case code === 2: return "Partly cloudy";
    case code === 3: return "Overcast";
    case code >= 45 && code <= 48: return "Foggy";
    case code >= 51 && code <= 53: return "Light drizzle";
    case code >= 55 && code <= 57: return "Freezing drizzle";
    case code >= 61 && code <= 63: return "Light rain";
    case code >= 65 && code <= 67: return "Heavy rain";
    case code >= 71 && code <= 73: return "Light snow";
    case code >= 75 && code <= 77: return "Heavy snowfall";
    case code >= 80 && code <= 82: return "Rain showers";
    case code === 85 || code === 86: return "Snow showers";
    case code === 95: return "Thunderstorm";
    case code === 96 || code === 99: return "Thunderstorm with hail";
    default: return "Unknown";
  }
}

// ── WEATHER CODE → CATEGORY ──
export function codeCategory(code, isDay) {
  if (code === 0) return isDay ? "sun" : "moon";
  if (code === 1 || code === 2) return isDay ? "cloud-sun" : "cloud";
  if (code === 3) return "cloud";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 95) return "storm";
  return "cloud";
}

// ── HELPERS ──
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const degToDir = (degrees) =>
  COMPASS_DIRS[Math.round(degrees / 45) % 8];

export const pad = (n) =>
  String(n).padStart(2, "0");

// ── TEMPERATURE CONVERSION (spread / rest demo — Module III) ──
export function toDisplay(tempC, isCelsius = true) {
  if (isCelsius) return Math.round(tempC) + "°";
  return Math.round(tempC * 9 / 5 + 32) + "°";
}

export function toDisplayWind(kmh, isCelsius = true) {
  if (isCelsius) return kmh.toFixed(0) + " km/h";
  return (kmh * 0.621371).toFixed(0) + " mph";
}

// ── DEBOUNCE as Higher-Order Function (closure pattern — Module III) ──
export function debounce(fn, delay) {
  let timerId = null;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── TIP STYLE MAP ──
const TIP_STYLE_MAP = {
  "Excellent": { color: "#4ade80", emoji: "✓" },
  "Good": { color: "#86efac", emoji: "✓" },
  "Fair": { color: "#facc15", emoji: "~" },
  "Poor": { color: "#fb923c", emoji: "!" },
  "Bad": { color: "#f87171", emoji: "✗" },
};

export function getTipStyle(rating) {
  return TIP_STYLE_MAP[rating] || { color: "#94a3b8", emoji: "·" };
}

// ── BUILD LIFESTYLE TIPS (uses map, filter, reduce — Module IX) ──
export function buildTips({ temp, humidity, precipProb, uv, windMax }) {
  // Using a declarative approach with map/filter instead of push()
  const tipDefinitions = [
    // Exercise
    {
      title: "Exercise",
      condition: () => precipProb >= PRECIP_WASH_RISK || windMax >= WIND_STRONG || temp <= TEMP_FREEZING || temp >= TEMP_EXTREME_HOT,
      trueResult: { text: "Harsh conditions today; opt for indoor workouts.", rating: "Poor" },
      altCondition: () => temp >= TEMP_WARM || humidity >= HUMIDITY_COMFORTABLE_HIGH,
      altResult: { text: "Hot or humid; choose light outdoor activity and rest often.", rating: "Fair" },
      fallback: { text: "Great conditions for a run, walk, or bike ride.", rating: "Excellent" },
    },
    // Sun Protection
    {
      title: "Sun Protection",
      condition: () => uv >= UV_HIGH,
      trueResult: { text: "Very high UV. Limit sun exposure 10am–4pm; SPF 50+ essential.", rating: "Bad" },
      altCondition: () => uv >= UV_MODERATE,
      altResult: { text: "High UV. Sunscreen, sunglasses and shade recommended.", rating: "Poor" },
      alt2Condition: () => uv >= UV_LOW,
      alt2Result: { text: "Moderate UV. Basic sun protection recommended.", rating: "Fair" },
      fallback: { text: "Low UV. Minimal protection needed.", rating: "Good" },
    },
    // Clothing
    {
      title: "Clothing",
      condition: () => temp >= TEMP_WARM,
      trueResult: { text: "Light, breathable fabrics; shorts and a t-shirt.", rating: "Fair" },
      altCondition: () => temp >= TEMP_MILD,
      altResult: { text: "Light layers work well; a shirt or light jacket.", rating: "Good" },
      alt2Condition: () => temp >= TEMP_COLD,
      alt2Result: { text: "A jacket is recommended; dress in layers.", rating: "Fair" },
      fallback: { text: "Bundle up; heavy coat, hat, and gloves needed.", rating: "Poor" },
    },
    // Umbrella
    {
      title: "Umbrella",
      condition: () => precipProb >= PRECIP_LIKELY,
      trueResult: { text: "Definitely bring one; rain is highly likely today.", rating: "Bad" },
      altCondition: () => precipProb >= PRECIP_LOW,
      altResult: { text: "Consider taking an umbrella; showers are possible.", rating: "Fair" },
      fallback: { text: "No need; rain is unlikely for most of the day.", rating: "Good" },
    },
    // Car Wash
    {
      title: "Car Wash",
      condition: () => precipProb >= PRECIP_WASH_RISK,
      trueResult: { text: "Not suitable; rain expected will undo any cleaning.", rating: "Bad" },
      altCondition: () => precipProb >= PRECIP_WASH_LOW,
      altResult: { text: "Risky; some chance of showers. Consider waiting.", rating: "Fair" },
      fallback: { text: "Good day to wash your car; rain is unlikely.", rating: "Good" },
    },
    // Skin Care
    {
      title: "Skin Care",
      condition: () => humidity >= HUMIDITY_STICKY,
      trueResult: { text: "High humidity; use mattifying and oil-control products.", rating: "Fair" },
      altCondition: () => humidity <= HUMIDITY_DRY,
      altResult: { text: "Dry air; apply extra moisturizer to prevent dryness.", rating: "Fair" },
      fallback: { text: "Comfortable humidity; regular skin routine is fine.", rating: "Good" },
    },
  ];

  // map() to transform definitions into tip objects (Module IX — Array Methods)
  return tipDefinitions.map((def) => {
    let result;
    if (def.condition()) {
      result = def.trueResult;
    } else if (def.altCondition && def.altCondition()) {
      result = def.altResult;
    } else if (def.alt2Condition && def.alt2Condition()) {
      result = def.alt2Result;
    } else {
      result = def.fallback;
    }
    // Spread operator (Module III) to merge title with result
    return { title: def.title, ...result };
  });
}

// ── AVERAGE using reduce() (Module IX — Array Methods) ──
export function averageTemperature(temps) {
  if (!temps || temps.length === 0) return 0;
  const sum = temps.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / temps.length);
}

// ── FILTER example (Module IX) ──
export function filterRainyHours(hourlyData) {
  const { time, precipitation_probability: precip } = hourlyData;
  return time
    .map((t, i) => ({ time: t, precipProb: precip?.[i] ?? 0 }))
    .filter((item) => item.precipProb >= PRECIP_MODERATE);
}

// ── LOCAL STORAGE helpers (Module V React / JS Module VI) ──
export function savePreference(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // localStorage may be unavailable in private browsing
    console.warn("Could not save preference to localStorage");
  }
}

export function loadPreference(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch (_) {
    return fallback;
  }
}
