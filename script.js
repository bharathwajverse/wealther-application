/* =====================================================
   ATMOSPHÈRE WEATHER  –  script.js
   Open-Meteo API (no key required)
===================================================== */

/* ── ELEMENTS ── */
const $id = id => document.getElementById(id);

const cityInput = $id("cityInput");
const searchBtn = $id("searchBtn");
const autocompleteEl = $id("autocomplete");
const locationEl = $id("location");
const temperatureEl = $id("temperature");
const feelsLikeEl = $id("feelsLike");
const conditionEl = $id("condition");
const mainIconEl = $id("mainIcon");
const highTempEl = $id("highTemp");
const lowTempEl = $id("lowTemp");
const hourlyEl = $id("hourly");
const dailyEl = $id("daily");
const windSpeedEl = $id("windSpeed");
const windGustEl = $id("windGust");
const windDirEl = $id("windDir");
const needleEl = $id("needle");
const sunriseEl = $id("sunrise");
const sunsetEl = $id("sunset");
const sunDotEl = $id("sunDot");
const sunGlowEl = $id("sunGlow");
const sunProgressEl = $id("sunProgress");
const dayLengthEl = $id("dayLength");
const humidityEl = $id("humidity");
const humidityTextEl = $id("humidityText");
const feelsLikeBottomEl = $id("feelsLikeBottom");
const windSpeedBottomEl = $id("windSpeedBottom");
const windGustBottomEl = $id("windGustBottom");
const visibilityEl = $id("visibility");
const visibilityTextEl = $id("visibilityText");
const uvEl = $id("uv");
const uvLabelEl = $id("uvLabel");
const precipProbEl = $id("precipProb");
const precipTextEl = $id("precipText");
const dayTypeEl = $id("dayType");
const dayTypeTextEl = $id("dayTypeText");
const dayLengthBottomEl = $id("dayLengthBottom");
const dayLengthSubEl = $id("dayLengthSub");
const tipsGrid = $id("tipsGrid");
const updatedEl = $id("updated");
const loadingBar = $id("loadingBar");
const toastEl = $id("toast");

/* ── STATE ── */
let sunriseUnix = 0;
let sunsetUnix = 0;
let isCelsius = true;
let rawData = null;
let acResults = [];
let acDebounce = null;
let bgCtx = null;
let bgAnim = null;
let currentWeatherCode = 0;

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  bindEvents();
  navigator.geolocation.getCurrentPosition(
    p => loadByCoords(p.coords.latitude, p.coords.longitude),
    () => searchCity("Delhi")
  );
});

function bindEvents() {
  searchBtn.addEventListener("click", doSearch);
  cityInput.addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch();
    if (e.key === "ArrowDown") focusAC(0);
    if (e.key === "Escape") closeAC();
  });
  cityInput.addEventListener("input", () => {
    clearTimeout(acDebounce);
    const v = cityInput.value.trim();
    if (v.length < 2) return closeAC();
    acDebounce = setTimeout(() => fetchAC(v), 300);
  });
  document.addEventListener("click", e => {
    if (!autocompleteEl.contains(e.target) && e.target !== cityInput) closeAC();
  });

  // Unit toggle
  document.querySelectorAll(".unit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".unit-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      isCelsius = btn.dataset.unit === "C";
      if (rawData) refreshUnits();
    });
  });
}

function doSearch() {
  const q = cityInput.value.trim();
  if (q) searchCity(q);
}

/* ── LOADING BAR ── */
function startLoading() {
  loadingBar.className = "loading";
}

function stopLoading() {
  loadingBar.className = "done";
}

/* ── TOAST ── */
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}

/* ── AUTOCOMPLETE ── */
async function fetchAC(query) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const r = await fetch(url);
    const d = await r.json();
    acResults = d.results || [];
    renderAC();
  } catch (_) {
    closeAC();
  }
}

function renderAC() {
  if (!acResults.length) return closeAC();
  autocompleteEl.innerHTML = acResults.map((loc, i) => `
    <div class="ac-item" tabindex="0" data-idx="${i}">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5;flex-shrink:0">
        <path d="M6 1a3 3 0 0 0-3 3c0 2.5 3 6 3 6s3-3.5 3-6a3 3 0 0 0-3-3z"/>
      </svg>
      ${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}
      <span class="ac-item-country">${loc.country_code}</span>
    </div>
  `).join('');
  autocompleteEl.classList.add("open");

  autocompleteEl.querySelectorAll(".ac-item").forEach((el, i) => {
    el.addEventListener("click", () => selectAC(i));
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") selectAC(i);
      if (e.key === "ArrowDown") focusAC(i + 1);
      if (e.key === "ArrowUp") i > 0 ? focusAC(i - 1) : cityInput.focus();
    });
  });
}

function selectAC(i) {
  const loc = acResults[i];
  cityInput.value = loc.name;
  closeAC();
  loadByCoords(loc.latitude, loc.longitude, `${loc.name}, ${loc.country_code}`);
}

function focusAC(i) {
  const items = autocompleteEl.querySelectorAll(".ac-item");
  if (items[i]) items[i].focus();
}

function closeAC() {
  autocompleteEl.classList.remove("open");
  autocompleteEl.innerHTML = "";
}

/* ── GEO SEARCH ── */
async function searchCity(name) {
  startLoading();
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.results?.length) throw new Error("City not found");
    const loc = d.results[0];
    loadByCoords(loc.latitude, loc.longitude, `${loc.name}, ${loc.country_code}`);
  } catch (e) {
    stopLoading();
    showToast(e.message || "City not found");
  }
}

/* ── MAIN DATA LOAD ── */
async function loadByCoords(lat, lon, label) {
  startLoading();
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day` +
      `&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,wind_speed_10m,visibility,apparent_temperature` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,apparent_temperature_max` +
      `&timezone=auto&forecast_days=7`;

    const r = await fetch(url);
    if (!r.ok) throw new Error("Forecast fetch failed");
    rawData = await r.json();
    rawData._label = label;

    currentWeatherCode = rawData.current.weather_code;
    applyTheme(currentWeatherCode);
    applyAll(rawData, label);
    stopLoading();
  } catch (e) {
    stopLoading();
    showToast("Failed to load weather data.");
    console.error(e);
  }
}

/* ── APPLY THEME ── */
function applyTheme(code) {
  const body = document.body;
  body.className = "";
  if (code === 0 || code === 1) body.classList.add("theme-clear");
  else if (code <= 3) body.classList.add("theme-clouds");
  else if (code <= 48) body.classList.add("theme-fog");
  else if (code <= 67) body.classList.add("theme-rain");
  else if (code <= 77) body.classList.add("theme-snow");
  else if (code >= 95) body.classList.add("theme-storm");
  else body.classList.add("theme-clouds");
  startBgAnimation(code);
}

/* ── UNIT CONVERSION ── */
function toDisplay(tempC) {
  if (isCelsius) return Math.round(tempC) + "°";
  return Math.round(tempC * 9 / 5 + 32) + "°";
}

function toDisplayWind(kmh) {
  if (isCelsius) return kmh.toFixed(0) + " km/h";
  return (kmh * 0.621371).toFixed(0) + " mph";
}

function refreshUnits() {
  applyAll(rawData, rawData._label);
}

/* ── APPLY ALL ── */
function applyAll(d, label) {
  applyHero(d, label);
  renderHourly(d);
  renderDaily(d);
  renderMetrics(d);
  renderLifestyleTips(d);
  moveSun();
  updatedEl.textContent = "Last updated: " + new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/* ── HERO ── */
function applyHero(d, label) {
  const cur = d.current;
  const daily0 = d.daily;
  const isDay = cur.is_day === 1;

  locationEl.textContent = label || "Current Location";
  temperatureEl.textContent = toDisplay(cur.temperature_2m);
  feelsLikeEl.textContent = toDisplay(cur.apparent_temperature);
  feelsLikeBottomEl.textContent = toDisplay(cur.apparent_temperature);

  const desc = codeToText(cur.weather_code);
  conditionEl.textContent = desc;

  if (daily0.temperature_2m_max?.length) {
    highTempEl.textContent = toDisplay(daily0.temperature_2m_max[0]);
    lowTempEl.textContent = toDisplay(daily0.temperature_2m_min[0]);
  }

  mainIconEl.innerHTML = bigWeatherSVG(cur.weather_code, isDay);

  // Wind
  windSpeedEl.textContent = toDisplayWind(cur.wind_speed_10m);
  windGustEl.textContent = cur.wind_gusts_10m != null ? toDisplayWind(cur.wind_gusts_10m) : "--";
  windDirEl.textContent = degToDir(cur.wind_direction_10m);
  needleEl.style.transform = `rotate(${cur.wind_direction_10m}deg) translateY(-18px)`;

  // Sunrise/sunset
  if (daily0.sunrise?.length) {
    sunriseUnix = Date.parse(daily0.sunrise[0]) / 1000;
    sunsetUnix = Date.parse(daily0.sunset[0]) / 1000;
    const srStr = fmtTime(daily0.sunrise[0]);
    const ssStr = fmtTime(daily0.sunset[0]);
    sunriseEl.textContent = srStr;
    sunsetEl.textContent = ssStr;
    const lenSec = sunsetUnix - sunriseUnix;
    const lenStr = `${Math.floor(lenSec / 3600)}h ${Math.floor((lenSec % 3600) / 60)}m`;
    dayLengthEl.textContent = lenStr;
    dayLengthBottomEl.textContent = lenStr;
    dayLengthSubEl.textContent = `${srStr} → ${ssStr}`;
    moveSun();
  }
}

/* ── HOURLY ── */
function renderHourly(d) {
  hourlyEl.innerHTML = "";
  const {
    time,
    temperature_2m: temps,
    weather_code: codes,
    precipitation_probability: precip
  } = d.hourly;
  const now = new Date();
  const currentHourISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

  // Find closest index to now
  let startIdx = 0;
  for (let i = 0; i < time.length; i++) {
    if (time[i] >= currentHourISO) {
      startIdx = i;
      break;
    }
  }

  for (let offset = 0; offset < 24 && startIdx + offset < time.length; offset++) {
    const i = startIdx + offset;
    const date = new Date(time[i]);
    const label = offset === 0 ? "Now" : date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    const isDay = date.getHours() >= 6 && date.getHours() < 20;
    const rain = precip?.[i];
    const isCurrent = offset === 0;

    const card = document.createElement("div");
    card.className = `hour-card glass${isCurrent ? " current-hour" : ""}`;
    card.innerHTML = `
      <div class="hour-label">${label}</div>
      <div class="hour-icon">${smallWeatherSVG(codes[i], isDay)}</div>
      <div class="hour-temp">${toDisplay(temps[i])}</div>
      ${rain != null ? `<div class="hour-rain">${rain}%</div>` : ""}
    `;
    hourlyEl.appendChild(card);
  }
}

/* ── DAILY ── */
function renderDaily(d) {
  dailyEl.innerHTML = "";
  const {
    time,
    temperature_2m_max: maxs,
    temperature_2m_min: mins,
    weather_code: codes
  } = d.daily;
  const absMax = Math.max(...maxs);
  const absMin = Math.min(...mins);
  const range = absMax - absMin || 1;

  for (let i = 0; i < Math.min(time.length, 7); i++) {
    const date = new Date(time[i]);
    const day = i === 0 ? "Today" : date.toLocaleDateString("en", {
      weekday: "short"
    });
    const desc = codeToText(codes[i]);
    const barLeft = ((mins[i] - absMin) / range) * 85;
    const barWidth = ((maxs[i] - mins[i]) / range) * 85;
    const isDay = true;

    dailyEl.innerHTML += `
      <div class="day-row">
        <span class="day-name" style="${i === 0 ? "font-weight:600" : "opacity:.8"}">${day}</span>
        <span class="day-icon">${tinyWeatherSVG(codes[i], isDay)}</span>
        <span class="day-desc">${desc}</span>
        <div class="day-bar-wrap">
          <div class="day-bar" style="left:${barLeft}%;width:${barWidth}%"></div>
        </div>
        <span class="day-lo">${toDisplay(mins[i])}</span>
        <span class="day-hi">${toDisplay(maxs[i])}</span>
      </div>
    `;
  }
}

/* ── METRICS ── */
function renderMetrics(d) {
  const daily0 = d.daily;
  const cur = d.current;

  // Humidity
  const h = cur.relative_humidity_2m;
  humidityEl.textContent = h + "%";
  humidityTextEl.textContent = h > 70 ? "Feels quite humid" : h < 40 ? "Dry air" : "Comfortable";
  $id("humidityBar").style.width = h + "%";

  // UV
  if (daily0.uv_index_max?.length) {
    const u = daily0.uv_index_max[0];
    uvEl.textContent = u.toFixed(0);
    uvLabelEl.textContent = u < 3 ? "Low" : u < 6 ? "Moderate" : u < 8 ? "High" : "Very High";
    const uvColor = u < 3 ? "#4ade80" : u < 6 ? "#facc15" : u < 8 ? "#fb923c" : "#f87171";
    $id("uvBar").style.background = uvColor;
    $id("uvBar").style.width = Math.min(u / 12 * 100, 100) + "%";
  }

  // Precip
  if (daily0.precipitation_probability_max?.length) {
    const p = daily0.precipitation_probability_max[0];
    precipProbEl.textContent = p + "%";
    precipTextEl.textContent = p === 0 ? "No rain expected" : p < 40 ? "Low chance" : p < 70 ? "Showers possible" : "Rain likely";
    $id("precipBar").style.width = p + "%";
  }

  // Visibility
  if (d.hourly.visibility?.length) {
    const visKm = d.hourly.visibility[0] / 1000;
    visibilityEl.textContent = visKm >= 10 ? "10+ km" : visKm.toFixed(1) + " km";
    visibilityTextEl.textContent = visKm >= 10 ? "Excellent" : visKm >= 5 ? "Good" : "Reduced";
  }

  // Wind max
  if (daily0.wind_speed_10m_max?.length) {
    windSpeedBottomEl.textContent = toDisplayWind(daily0.wind_speed_10m_max[0]);
    windGustBottomEl.textContent = daily0.wind_gusts_10m_max?.[0] ?
      "Gusts " + toDisplayWind(daily0.wind_gusts_10m_max[0]) :
      "--";
  }

  // Day type
  const t = daily0.temperature_2m_max[0];
  const p2 = daily0.precipitation_probability_max?.[0] ?? 0;
  let type = "Calm Day",
    text = "Comfortable for most activities.";
  if (p2 > 70) {
    type = "Rainy Day";
    text = "Carry an umbrella; rain likely.";
  } else if (t >= 33) {
    type = "Hot Day";
    text = "Stay hydrated; limit midday sun.";
  } else if (t <= 12) {
    type = "Cold Day";
    text = "Layer up before heading out.";
  } else if (p2 >= 40) {
    type = "Cloudy Day";
    text = "Overcast; showers possible.";
  }
  dayTypeEl.textContent = type;
  dayTypeTextEl.textContent = text;
}

/* ── LIFESTYLE TIPS ── */
function renderLifestyleTips(d) {
  if (!tipsGrid) return;
  const cur = d.current;
  const daily0 = d.daily;
  const humidity = cur.relative_humidity_2m;
  const precipProb = daily0.precipitation_probability_max?.[0] ?? 0;
  const uv = daily0.uv_index_max?.[0] ?? 0;
  const windMax = daily0.wind_speed_10m_max?.[0] ?? cur.wind_speed_10m;
  const temp = cur.temperature_2m;

  const tips = buildTips({
    temp,
    humidity,
    precipProb,
    uv,
    windMax
  });
  tipsGrid.innerHTML = "";

  tips.forEach(t => {
    const card = document.createElement("div");
    card.className = "tip-card glass";
    const {
      color,
      emoji
    } = getTipStyle(t.rating);
    card.innerHTML = `
      <div class="tip-badge" style="background:${color}22;color:${color}">${emoji} ${t.rating}</div>
      <div class="tip-title">${t.title}</div>
      <div class="tip-text">${t.text}</div>
    `;
    tipsGrid.appendChild(card);
  });
}

function getTipStyle(rating) {
  const map = {
    "Excellent": {
      color: "#4ade80",
      emoji: "✓"
    },
    "Good": {
      color: "#86efac",
      emoji: "✓"
    },
    "Fair": {
      color: "#facc15",
      emoji: "~"
    },
    "Poor": {
      color: "#fb923c",
      emoji: "!"
    },
    "Bad": {
      color: "#f87171",
      emoji: "✗"
    },
  };
  return map[rating] || {
    color: "#94a3b8",
    emoji: "·"
  };
}

function buildTips({
  temp,
  humidity,
  precipProb,
  uv,
  windMax
}) {
  const tips = [];

  // Exercise
  if (precipProb >= 60 || windMax >= 45 || temp <= 3 || temp >= 37) {
    tips.push({
      title: "Exercise",
      text: "Harsh conditions today; opt for indoor workouts.",
      rating: "Poor"
    });
  } else if (temp >= 30 || humidity >= 75) {
    tips.push({
      title: "Exercise",
      text: "Hot or humid; choose light outdoor activity and rest often.",
      rating: "Fair"
    });
  } else {
    tips.push({
      title: "Exercise",
      text: "Great conditions for a run, walk, or bike ride.",
      rating: "Excellent"
    });
  }

  // UV / Sun protection
  if (uv >= 8) {
    tips.push({
      title: "Sun Protection",
      text: "Very high UV. Limit sun exposure 10am–4pm; SPF 50+ essential.",
      rating: "Bad"
    });
  } else if (uv >= 6) {
    tips.push({
      title: "Sun Protection",
      text: "High UV. Sunscreen, sunglasses and shade recommended.",
      rating: "Poor"
    });
  } else if (uv >= 3) {
    tips.push({
      title: "Sun Protection",
      text: "Moderate UV. Basic sun protection recommended.",
      rating: "Fair"
    });
  } else {
    tips.push({
      title: "Sun Protection",
      text: "Low UV. Minimal protection needed.",
      rating: "Good"
    });
  }

  // Clothing
  if (temp >= 30) {
    tips.push({
      title: "Clothing",
      text: "Light, breathable fabrics; shorts and a t-shirt.",
      rating: "Fair"
    });
  } else if (temp >= 20) {
    tips.push({
      title: "Clothing",
      text: "Light layers work well; a shirt or light jacket.",
      rating: "Good"
    });
  } else if (temp >= 10) {
    tips.push({
      title: "Clothing",
      text: "A jacket is recommended; dress in layers.",
      rating: "Fair"
    });
  } else {
    tips.push({
      title: "Clothing",
      text: "Bundle up; heavy coat, hat, and gloves needed.",
      rating: "Poor"
    });
  }

  // Umbrella
  if (precipProb >= 70) {
    tips.push({
      title: "Umbrella",
      text: "Definitely bring one; rain is highly likely today.",
      rating: "Bad"
    });
  } else if (precipProb >= 35) {
    tips.push({
      title: "Umbrella",
      text: "Consider taking an umbrella; showers are possible.",
      rating: "Fair"
    });
  } else {
    tips.push({
      title: "Umbrella",
      text: "No need; rain is unlikely for most of the day.",
      rating: "Good"
    });
  }

  // Car wash
  if (precipProb >= 60) {
    tips.push({
      title: "Car Wash",
      text: "Not suitable; rain expected will undo any cleaning.",
      rating: "Bad"
    });
  } else if (precipProb >= 30) {
    tips.push({
      title: "Car Wash",
      text: "Risky; some chance of showers. Consider waiting.",
      rating: "Fair"
    });
  } else {
    tips.push({
      title: "Car Wash",
      text: "Good day to wash your car; rain is unlikely.",
      rating: "Good"
    });
  }

  // Skin
  if (humidity >= 80) {
    tips.push({
      title: "Skin Care",
      text: "High humidity; use mattifying and oil-control products.",
      rating: "Fair"
    });
  } else if (humidity <= 35) {
    tips.push({
      title: "Skin Care",
      text: "Dry air; apply extra moisturizer to prevent dryness.",
      rating: "Fair"
    });
  } else {
    tips.push({
      title: "Skin Care",
      text: "Comfortable humidity; regular skin routine is fine.",
      rating: "Good"
    });
  }

  return tips;
}

/* ── SUN ARC ── */
function moveSun() {
  if (!sunriseUnix || !sunsetUnix || sunriseUnix === sunsetUnix) return;
  const now = Date.now() / 1000;
  const p = Math.max(0, Math.min(1, (now - sunriseUnix) / (sunsetUnix - sunriseUnix)));
  const angle = p * Math.PI;
  const cx = 50 + 45 * Math.cos(Math.PI - angle);
  const cy = 48 - 45 * Math.sin(angle);

  if (sunDotEl) {
    sunDotEl.setAttribute("cx", cx);
    sunDotEl.setAttribute("cy", cy);
  }
  if (sunGlowEl) {
    sunGlowEl.setAttribute("cx", cx);
    sunGlowEl.setAttribute("cy", cy);
  }

  // Draw arc progress
  if (sunProgressEl && p > 0) {
    const startX = 5,
      startY = 48;
    const sweep = p < 1 ? 0 : 1;
    // Large arc flag needed if angle > PI
    const largeArc = p > 0.5 ? 1 : 0;
    sunProgressEl.setAttribute("d", `M5 48 A45 45 0 ${largeArc} 1 ${cx.toFixed(2)} ${cy.toFixed(2)}`);
  }
}

/* ── CANVAS BACKGROUND ANIMATION ── */
function initCanvas() {
  const canvas = $id("bg-canvas");
  bgCtx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  const canvas = $id("bg-canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function startBgAnimation(code) {
  if (bgAnim) cancelAnimationFrame(bgAnim);
  const canvas = $id("bg-canvas");
  const ctx = bgCtx;

  // Determine particles based on weather
  const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isSnow = code >= 71 && code <= 77;
  const isStorm = code >= 95;
  const isClear = code === 0 || code === 1;
  const isCloudy = code === 2 || code === 3;

  const particles = [];
  const count = isRain ? 120 : isSnow ? 60 : isStorm ? 80 : 30;

  for (let i = 0; i < count; i++) {
    particles.push(createParticle(isRain, isSnow, isStorm, isClear, canvas));
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base gradient
    const grd = ctx.createRadialGradient(canvas.width * .5, 0, 0, canvas.width * .5, canvas.height * .7, canvas.height);
    if (isStorm) {
      grd.addColorStop(0, "rgba(30,0,60,.7)");
      grd.addColorStop(1, "rgba(4,6,15,1)");
    } else if (isRain) {
      grd.addColorStop(0, "rgba(8,20,40,.6)");
      grd.addColorStop(1, "rgba(4,6,15,1)");
    } else if (isSnow) {
      grd.addColorStop(0, "rgba(14,26,38,.5)");
      grd.addColorStop(1, "rgba(4,6,15,1)");
    } else if (isClear) {
      grd.addColorStop(0, "rgba(10,26,60,.5)");
      grd.addColorStop(1, "rgba(4,6,15,1)");
    } else {
      grd.addColorStop(0, "rgba(13,18,32,.5)");
      grd.addColorStop(1, "rgba(4,6,15,1)");
    }

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars for clear sky
    if (isClear) {
      particles.forEach(p => {
        p.alpha = (.3 + .4 * Math.sin(Date.now() * .001 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${p.alpha})`;
        ctx.fill();
      });
    }

    // Clouds
    if (isCloudy || isRain || isStorm) {
      particles.forEach(p => {
        p.x += p.vx;
        if (p.x > canvas.width + 120) p.x = -120;
        ctx.save();
        ctx.globalAlpha = .04;
        ctx.fillStyle = isStorm ? "#6644aa" : "#8899cc";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Rain
    if (isRain || isStorm) {
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
        ctx.strokeStyle = isStorm ?
          `rgba(180,140,255,${p.alpha})` :
          `rgba(120,180,255,${p.alpha})`;
        ctx.lineWidth = p.r;
        ctx.stroke();
      });
    }

    // Snow
    if (isSnow) {
      particles.forEach(p => {
        p.x += Math.sin(Date.now() * .0005 + p.phase) * .5;
        p.y += p.vy;
        if (p.y > canvas.height) {
          p.y = -5;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,240,255,${p.alpha})`;
        ctx.fill();
      });
    }

    bgAnim = requestAnimationFrame(frame);
  }
  frame();
}

function createParticle(isRain, isSnow, isStorm, isClear, canvas) {
  if (isRain || isStorm) return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: -1 - Math.random(),
    vy: 12 + Math.random() * 8,
    r: .5 + Math.random() * .5,
    alpha: .1 + Math.random() * .2,
    phase: Math.random() * Math.PI * 2,
  };
  if (isSnow) return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vy: .5 + Math.random(),
    r: 1 + Math.random() * 2,
    alpha: .3 + Math.random() * .4,
    phase: Math.random() * Math.PI * 2,
  };
  // Stars / clouds
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * .6,
    r: .5 + Math.random() * 1,
    vx: .05 + Math.random() * .15,
    alpha: 0,
    phase: Math.random() * Math.PI * 2,
  };
}

/* ── WEATHER CODE → TEXT ── */
function codeToText(c) {
  if (c === 0) return "Clear sky";
  if (c === 1) return "Mainly clear";
  if (c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c >= 45 && c <= 48) return "Foggy";
  if (c >= 51 && c <= 53) return "Light drizzle";
  if (c >= 55 && c <= 57) return "Freezing drizzle";
  if (c >= 61 && c <= 63) return "Light rain";
  if (c >= 65 && c <= 67) return "Heavy rain";
  if (c >= 71 && c <= 73) return "Light snow";
  if (c >= 75 && c <= 77) return "Heavy snowfall";
  if (c >= 80 && c <= 82) return "Rain showers";
  if (c === 85 || c === 86) return "Snow showers";
  if (c === 95) return "Thunderstorm";
  if (c === 96 || c === 99) return "Thunderstorm with hail";
  return "Unknown";
}

/* ── WEATHER SVG ICONS ── */
function bigWeatherSVG(code, isDay) {
  const cat = codeCategory(code, isDay);
  const col = {
    "sun": ["#fde68a", "#fbbf24"],
    "moon": ["#e0e7ff", "#a5b4fc"],
    "cloud": ["#cbd5e1", "#94a3b8"],
    "cloud-sun": ["#fde68a", "#94a3b8"],
    "rain": ["#7dd3fc", "#3b82f6"],
    "snow": ["#e0f2fe", "#bae6fd"],
    "storm": ["#c4b5fd", "#7c3aed"],
    "fog": ["#cbd5e1", "#94a3b8"],
  }[cat] || ["#fff", "#aaa"];

  const icons = {
    "sun": `<svg viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="18" fill="${col[0]}" opacity=".9"/>
      <circle cx="40" cy="40" r="14" fill="${col[1]}"/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const r1 = 24, r2 = 30, x1 = 40 + r1 * Math.cos(a * Math.PI / 180), y1 = 40 + r1 * Math.sin(a * Math.PI / 180),
        x2 = 40 + r2 * Math.cos(a * Math.PI / 180), y2 = 40 + r2 * Math.sin(a * Math.PI / 180);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col[0]}" stroke-width="2.5" stroke-linecap="round"/>`;
    }).join('')}
    </svg>`,
    "moon": `<svg viewBox="0 0 80 80" fill="none">
      <path d="M52 18a24 24 0 1 1-24 44 18 18 0 0 0 24-44z" fill="${col[0]}" opacity=".85"/>
    </svg>`,
    "cloud": `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 50H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[0]}" opacity=".85"/>
    </svg>`,
    "cloud-sun": `<svg viewBox="0 0 80 80" fill="none">
      <circle cx="30" cy="26" r="12" fill="${col[0]}" opacity=".75"/>
      ${[0, 60, 120, 180, 240, 300].map(a => { const r1 = 16, r2 = 21, x1 = 30 + r1 * Math.cos(a * Math.PI / 180), y1 = 26 + r1 * Math.sin(a * Math.PI / 180), x2 = 30 + r2 * Math.cos(a * Math.PI / 180), y2 = 26 + r2 * Math.sin(a * Math.PI / 180); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col[0]}" stroke-width="2" stroke-linecap="round"/>`; }).join('')}
      <path d="M60 54H28a12 12 0 0 1 0-24 12 12 0 0 1 22-3 8 8 0 0 1 10 9 8 8 0 0 1 0 18z" fill="${col[1]}"/>
    </svg>`,
    "rain": `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 42H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[1]}" opacity=".7"/>
      ${[[28, 52], [40, 60], [34, 68], [52, 56]].map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 8}" stroke="${col[0]}" stroke-width="2" stroke-linecap="round"/>`).join('')}
    </svg>`,
    "snow": `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 42H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[1]}" opacity=".6"/>
      ${[[28, 54], [40, 58], [34, 66], [52, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${col[0]}" opacity=".8"/>`).join('')}
    </svg>`,
    "storm": `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 44H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[1]}" opacity=".6"/>
      <path d="M44 50l-8 14h6l-6 10 16-18h-8l8-6z" fill="${col[0]}" opacity=".9"/>
    </svg>`,
    "fog": `<svg viewBox="0 0 80 80" fill="none">
      ${[30, 38, 46, 54].map((y, i) => `<line x1="${20 + i * 2}" y1="${y}" x2="${60 - i * 2}" y2="${y}" stroke="${col[0]}" stroke-width="3" stroke-linecap="round" opacity="${.8 - i * .15}"/>`).join('')}
    </svg>`,
  };
  return icons[cat] || icons["cloud"];
}

function codeCategory(code, isDay) {
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

function smallWeatherSVG(code, isDay) {
  const cat = codeCategory(code, isDay);
  const col = {
    "sun": "#fbbf24",
    "moon": "#a5b4fc",
    "cloud": "#94a3b8",
    "cloud-sun": "#fbbf24",
    "rain": "#60a5fa",
    "snow": "#bae6fd",
    "storm": "#a78bfa",
    "fog": "#94a3b8"
  }[cat] || "#fff";

  const tiny = {
    "sun": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="5" fill="${col}"/>${[0, 60, 120, 180, 240, 300].map(a => { const r1 = 7, r2 = 10, x1 = 11 + r1 * Math.cos(a * Math.PI / 180), y1 = 11 + r1 * Math.sin(a * Math.PI / 180), x2 = 11 + r2 * Math.cos(a * Math.PI / 180), y2 = 11 + r2 * Math.sin(a * Math.PI / 180); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`; }).join('')}</svg>`,
    "moon": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M16 5a9 9 0 1 1-9 16 7 7 0 0 0 9-16z" fill="${col}"/></svg>`,
    "cloud": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 15H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".8"/></svg>`,
    "cloud-sun": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="7" r="4" fill="${col}" opacity=".8"/><path d="M18 15H8a5 5 0 0 1 0-10 5 5 0 0 1 8-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/></svg>`,
    "rain": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 12H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/><line x1="8" y1="15" x2="7" y2="19" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="15" x2="11" y2="19" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    "snow": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 12H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/><circle cx="8" cy="17" r="1.5" fill="${col}"/><circle cx="12" cy="17" r="1.5" fill="${col}"/></svg>`,
    "storm": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 12H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/><path d="M12 13l-3 5h2l-2 4 6-7h-3l3-2z" fill="${col}"/></svg>`,
    "fog": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="4" y1="10" x2="18" y2="10" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="14" x2="16" y2="14" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };
  return tiny[cat] || tiny["cloud"];
}

function tinyWeatherSVG(code, isDay) {
  return smallWeatherSVG(code, isDay);
}

/* ── HELPERS ── */
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function degToDir(d) {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];
}

function pad(n) {
  return String(n).padStart(2, "0");
}