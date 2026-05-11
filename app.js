/* =====================================================
   ATMOSPHÈRE WEATHER — app.js (ES Module entry point)
   Main controller using ES6 Class pattern
   Demonstrates: import/export, class, this, classList,
   preventDefault, event delegation, localStorage,
   map/filter/reduce, spread, async/await
===================================================== */

// ── ES MODULE IMPORTS (JS Module X) ──
import { WeatherService } from "./weather-service.js";
import { CanvasBackground } from "./canvas.js";
import { bigWeatherSVG, smallWeatherSVG } from "./weather-icons.js";
import {
  codeToText,
  toDisplay,
  toDisplayWind,
  debounce,
  fmtTime,
  degToDir,
  pad,
  getTipStyle,
  buildTips,
  averageTemperature,
  filterRainyHours,
  savePreference,
  loadPreference,
  STORAGE_KEY_UNIT,
  STORAGE_KEY_CITY,
  TOAST_DURATION_MS,
  AC_MIN_CHARS,
  HOURLY_COUNT,
  TEMP_HOT,
  TEMP_COOL,
  PRECIP_LIKELY,
  PRECIP_MODERATE,
} from "./utils.js";

/* =====================================================
   WeatherApp CLASS (JS Module VIII — Classes)
   Main application controller. Demonstrates:
   - constructor, this keyword
   - classList (not bare className)
   - Form submit with preventDefault
   - Event listeners with event objects
   - localStorage persistence
===================================================== */
class WeatherApp {
  constructor() {
    // ── Cache DOM elements ──
    this.elements = {
      searchForm: document.getElementById("searchForm"),
      cityInput: document.getElementById("cityInput"),
      searchBtn: document.getElementById("searchBtn"),
      autocomplete: document.getElementById("autocomplete"),
      location: document.getElementById("location"),
      temperature: document.getElementById("temperature"),
      feelsLike: document.getElementById("feelsLike"),
      condition: document.getElementById("condition"),
      mainIcon: document.getElementById("mainIcon"),
      highTemp: document.getElementById("highTemp"),
      lowTemp: document.getElementById("lowTemp"),
      hourly: document.getElementById("hourly"),
      daily: document.getElementById("daily"),
      windSpeed: document.getElementById("windSpeed"),
      windGust: document.getElementById("windGust"),
      windDir: document.getElementById("windDir"),
      needle: document.getElementById("needle"),
      sunrise: document.getElementById("sunrise"),
      sunset: document.getElementById("sunset"),
      sunDot: document.getElementById("sunDot"),
      sunGlow: document.getElementById("sunGlow"),
      sunProgress: document.getElementById("sunProgress"),
      dayLength: document.getElementById("dayLength"),
      humidity: document.getElementById("humidity"),
      humidityText: document.getElementById("humidityText"),
      humidityBar: document.getElementById("humidityBar"),
      feelsLikeBottom: document.getElementById("feelsLikeBottom"),
      windSpeedBottom: document.getElementById("windSpeedBottom"),
      windGustBottom: document.getElementById("windGustBottom"),
      visibility: document.getElementById("visibility"),
      visibilityText: document.getElementById("visibilityText"),
      uv: document.getElementById("uv"),
      uvLabel: document.getElementById("uvLabel"),
      uvBar: document.getElementById("uvBar"),
      precipProb: document.getElementById("precipProb"),
      precipText: document.getElementById("precipText"),
      precipBar: document.getElementById("precipBar"),
      dayType: document.getElementById("dayType"),
      dayTypeText: document.getElementById("dayTypeText"),
      dayLengthBottom: document.getElementById("dayLengthBottom"),
      dayLengthSub: document.getElementById("dayLengthSub"),
      tipsGrid: document.getElementById("tipsGrid"),
      updated: document.getElementById("updated"),
      loadingBar: document.getElementById("loadingBar"),
      toast: document.getElementById("toast"),
    };

    // ── STATE (mutable values — Module VI) ──
    this.sunriseUnix = 0;
    this.sunsetUnix = 0;
    this.isCelsius = loadPreference(STORAGE_KEY_UNIT, true);    // localStorage!
    this.rawData = null;
    this.acResults = [];
    this.currentWeatherCode = 0;

    // ── SERVICES (composition pattern) ──
    this.weatherService = WeatherService.create();
    this.canvasBackground = new CanvasBackground("bg-canvas");

    // ── Debounced autocomplete (HOF closure — Module III) ──
    this.debouncedFetchAC = debounce(
      (query) => this.fetchAutocomplete(query),
      AC_MIN_CHARS * 100 + 100  // ~300ms
    );

    // ── BIND & INIT ──
    this.bindEvents();
    this.restoreUnitUI();
    this.initLocation();
  }

  // ── LOADING BAR (classList instead of bare className — BUG FIX) ──
  startLoading() {
    const bar = this.elements.loadingBar;
    bar.classList.remove("done");
    bar.classList.add("loading");
  }

  stopLoading() {
    const bar = this.elements.loadingBar;
    bar.classList.remove("loading");
    bar.classList.add("done");
  }

  // ── TOAST ──
  showToast(msg) {
    const toast = this.elements.toast;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), TOAST_DURATION_MS);
  }

  // ── RESTORE UNIT UI from localStorage ──
  restoreUnitUI() {
    document.querySelectorAll(".unit-btn").forEach((btn) => {
      const isActive =
        (this.isCelsius && btn.dataset.unit === "C") ||
        (!this.isCelsius && btn.dataset.unit === "F");
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    });
  }

  // ── EVENT BINDING ──
  bindEvents() {
    const { searchForm, cityInput, autocomplete } = this.elements;

    // Form submit with preventDefault (Module X — Events)
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();                // ← preventDefault!
      e.stopPropagation();               // ← event propagation demo
      const query = cityInput.value.trim();
      if (query.length >= AC_MIN_CHARS) {
        this.searchCity(query);
      }
    });

    // Keyboard events with event object properties (Module IV — JS Events)
    cityInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.focusAutocomplete(0);
      }
      if (e.key === "Escape") {
        this.closeAutocomplete();
      }
    });

    // Input event — debounced autocomplete
    cityInput.addEventListener("input", (e) => {
      const value = e.target.value.trim();      // ← e.target usage
      if (value.length < AC_MIN_CHARS) {
        this.closeAutocomplete();
        return;
      }
      this.debouncedFetchAC(value);
    });

    // Click outside to close autocomplete (event delegation)
    document.addEventListener("click", (e) => {
      if (!autocomplete.contains(e.target) && e.target !== cityInput) {
        this.closeAutocomplete();
      }
    });

    // Unit toggle — event delegation on radiogroup
    document.querySelectorAll(".unit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget;           // ← e.currentTarget usage
        document.querySelectorAll(".unit-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-checked", "false");
        });
        target.classList.add("active");
        target.setAttribute("aria-checked", "true");

        this.isCelsius = target.dataset.unit === "C";

        // Persist preference to localStorage (JSON.stringify)
        savePreference(STORAGE_KEY_UNIT, this.isCelsius);

        if (this.rawData) this.applyAll(this.rawData, this.rawData._label);
      });
    });
  }

  // ── AUTOCOMPLETE ──
  async fetchAutocomplete(query) {
    const results = await this.weatherService.fetchAutocomplete(query);
    this.acResults = results;
    this.renderAutocomplete();
  }

  renderAutocomplete() {
    const el = this.elements.autocomplete;
    if (!this.acResults.length) {
      this.closeAutocomplete();
      return;
    }

    // Using map() to build HTML (Module IX — Array Methods)
    el.innerHTML = this.acResults
      .map((loc, i) => `
        <div class="ac-item" tabindex="0" data-idx="${i}" role="option">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5;flex-shrink:0" aria-hidden="true">
            <path d="M6 1a3 3 0 0 0-3 3c0 2.5 3 6 3 6s3-3.5 3-6a3 3 0 0 0-3-3z"/>
          </svg>
          ${this.escapeHtml(loc.name)}${loc.admin1 ? ", " + this.escapeHtml(loc.admin1) : ""}
          <span class="ac-item-country">${this.escapeHtml(loc.country_code)}</span>
        </div>
      `)
      .join("");

    el.classList.add("open");

    // Attach listeners to each item
    el.querySelectorAll(".ac-item").forEach((item, i) => {
      item.addEventListener("click", () => this.selectAutocomplete(i));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.selectAutocomplete(i);
        if (e.key === "ArrowDown") this.focusAutocomplete(i + 1);
        if (e.key === "ArrowUp") {
          i > 0 ? this.focusAutocomplete(i - 1) : this.elements.cityInput.focus();
        }
      });
    });
  }

  // ── XSS PROTECTION (sanitize HTML — Security fix) ──
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  selectAutocomplete(index) {
    const loc = this.acResults[index];
    this.elements.cityInput.value = loc.name;
    this.closeAutocomplete();

    const label = `${loc.name}, ${loc.country_code}`;
    savePreference(STORAGE_KEY_CITY, { lat: loc.latitude, lon: loc.longitude, label });
    this.loadByCoords(loc.latitude, loc.longitude, label);
  }

  focusAutocomplete(index) {
    const items = this.elements.autocomplete.querySelectorAll(".ac-item");
    if (items[index]) items[index].focus();
  }

  closeAutocomplete() {
    this.elements.autocomplete.classList.remove("open");
    this.elements.autocomplete.innerHTML = "";
  }

  // ── INITIAL LOCATION ──
  initLocation() {
    // Try to restore last city from localStorage
    const lastCity = loadPreference(STORAGE_KEY_CITY, null);

    navigator.geolocation.getCurrentPosition(
      (pos) => this.loadByCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Fallback: use stored city or default
        if (lastCity) {
          this.loadByCoords(lastCity.lat, lastCity.lon, lastCity.label);
        } else {
          this.searchCity("Delhi");
        }
      }
    );
  }

  // ── SEARCH CITY BY NAME ──
  async searchCity(name) {
    this.startLoading();
    try {
      const results = await this.weatherService.searchCity(name, 1);
      const loc = results[0];
      const label = `${loc.name}, ${loc.country_code}`;
      savePreference(STORAGE_KEY_CITY, { lat: loc.latitude, lon: loc.longitude, label });
      await this.loadByCoords(loc.latitude, loc.longitude, label);
    } catch (error) {
      this.stopLoading();
      this.showToast(error.message || "City not found");
      console.error("Search error:", error);
    }
  }

  // ── LOAD WEATHER DATA BY COORDINATES ──
  async loadByCoords(lat, lon, label) {
    this.startLoading();
    try {
      const data = await this.weatherService.fetchForecast(lat, lon);
      // Using spread operator to create new object (immutability — Module VI)
      this.rawData = { ...data, _label: label };

      this.currentWeatherCode = data.current.weather_code;
      this.applyTheme(this.currentWeatherCode);
      this.applyAll(this.rawData, label);
      this.stopLoading();
    } catch (error) {
      this.stopLoading();
      this.showToast("Failed to load weather data.");
      console.error("Load error:", error);
    }
  }

  // ── APPLY THEME (classList fix — BUG FIX) ──
  applyTheme(code) {
    const body = document.body;
    // Use classList.remove instead of bare className = "" (BUG FIX)
    const themes = ["theme-clear", "theme-clouds", "theme-fog", "theme-rain", "theme-snow", "theme-storm"];
    themes.forEach((t) => body.classList.remove(t));

    if (code === 0 || code === 1) body.classList.add("theme-clear");
    else if (code <= 3) body.classList.add("theme-clouds");
    else if (code <= 48) body.classList.add("theme-fog");
    else if (code <= 67) body.classList.add("theme-rain");
    else if (code <= 77) body.classList.add("theme-snow");
    else if (code >= 95) body.classList.add("theme-storm");
    else body.classList.add("theme-clouds");

    this.canvasBackground.start(code);
  }

  // ── APPLY ALL DATA ──
  applyAll(data, label) {
    this.applyHero(data, label);
    this.renderHourly(data);
    this.renderDaily(data);
    this.renderMetrics(data);
    this.renderLifestyleTips(data);
    this.moveSun();

    // Show weekly average temperature using reduce() (Module IX)
    const weekAvg = averageTemperature(data.daily.temperature_2m_max);
    console.info(`Weekly avg high: ${toDisplay(weekAvg, this.isCelsius)}`);

    // Show rainy hours using filter() (Module IX)
    const rainyHours = filterRainyHours(data.hourly);
    if (rainyHours.length > 0) {
      console.info(`${rainyHours.length} hours with rain probability ≥ 40%`);
    }

    this.elements.updated.textContent =
      "Last updated: " +
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ── HERO SECTION ──
  applyHero(data, label) {
    const { current: cur, daily: daily0 } = data;   // destructuring
    const isDay = cur.is_day === 1;

    this.elements.location.textContent = label || "Current Location";
    this.elements.temperature.textContent = toDisplay(cur.temperature_2m, this.isCelsius);
    this.elements.feelsLike.textContent = toDisplay(cur.apparent_temperature, this.isCelsius);
    this.elements.feelsLikeBottom.textContent = toDisplay(cur.apparent_temperature, this.isCelsius);
    this.elements.condition.textContent = codeToText(cur.weather_code);

    if (daily0.temperature_2m_max?.length) {
      this.elements.highTemp.textContent = toDisplay(daily0.temperature_2m_max[0], this.isCelsius);
      this.elements.lowTemp.textContent = toDisplay(daily0.temperature_2m_min[0], this.isCelsius);
    }

    this.elements.mainIcon.innerHTML = bigWeatherSVG(cur.weather_code, isDay);

    // Wind
    this.elements.windSpeed.textContent = toDisplayWind(cur.wind_speed_10m, this.isCelsius);
    this.elements.windGust.textContent =
      cur.wind_gusts_10m != null ? toDisplayWind(cur.wind_gusts_10m, this.isCelsius) : "--";
    this.elements.windDir.textContent = degToDir(cur.wind_direction_10m);
    this.elements.needle.style.transform = `rotate(${cur.wind_direction_10m}deg) translateY(-18px)`;

    // Sunrise / Sunset
    if (daily0.sunrise?.length) {
      this.sunriseUnix = Date.parse(daily0.sunrise[0]) / 1000;
      this.sunsetUnix = Date.parse(daily0.sunset[0]) / 1000;
      const srStr = fmtTime(daily0.sunrise[0]);
      const ssStr = fmtTime(daily0.sunset[0]);
      this.elements.sunrise.textContent = srStr;
      this.elements.sunset.textContent = ssStr;

      const lenSec = this.sunsetUnix - this.sunriseUnix;
      const lenStr = `${Math.floor(lenSec / 3600)}h ${Math.floor((lenSec % 3600) / 60)}m`;
      this.elements.dayLength.textContent = lenStr;
      this.elements.dayLengthBottom.textContent = lenStr;
      this.elements.dayLengthSub.textContent = `${srStr} → ${ssStr}`;
      this.moveSun();
    }
  }

  // ── HOURLY FORECAST ──
  renderHourly(data) {
    const el = this.elements.hourly;
    el.innerHTML = "";

    const { time, temperature_2m: temps, weather_code: codes, precipitation_probability: precip } = data.hourly;
    const now = new Date();
    const currentHourISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

    let startIdx = time.findIndex((t) => t >= currentHourISO);
    if (startIdx === -1) startIdx = 0;

    // Build all cards, then append (fixes innerHTML += in loop — BUG FIX)
    const fragment = document.createDocumentFragment();

    for (let offset = 0; offset < HOURLY_COUNT && startIdx + offset < time.length; offset++) {
      const i = startIdx + offset;
      const date = new Date(time[i]);
      const label = offset === 0 ? "Now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const isDay = date.getHours() >= 6 && date.getHours() < 20;
      const rain = precip?.[i];
      const isCurrent = offset === 0;

      const card = document.createElement("div");
      card.className = `hour-card glass${isCurrent ? " current-hour" : ""}`;
      card.setAttribute("role", "listitem");
      card.innerHTML = `
        <div class="hour-label">${label}</div>
        <div class="hour-icon">${smallWeatherSVG(codes[i], isDay)}</div>
        <div class="hour-temp">${toDisplay(temps[i], this.isCelsius)}</div>
        ${rain != null ? `<div class="hour-rain">${rain}%</div>` : ""}
      `;
      fragment.appendChild(card);
    }

    el.appendChild(fragment);
  }

  // ── DAILY FORECAST ──
  renderDaily(data) {
    const { time, temperature_2m_max: maxs, temperature_2m_min: mins, weather_code: codes } = data.daily;
    const absMax = Math.max(...maxs);     // spread operator usage
    const absMin = Math.min(...mins);     // spread operator usage
    const range = absMax - absMin || 1;

    // Build string first, assign innerHTML ONCE (fixes innerHTML += in loop — BUG FIX)
    const html = time
      .slice(0, 7)
      .map((t, i) => {
        const date = new Date(t);
        const day = i === 0 ? "Today" : date.toLocaleDateString("en", { weekday: "short" });
        const desc = codeToText(codes[i]);
        const barLeft = ((mins[i] - absMin) / range) * 85;
        const barWidth = ((maxs[i] - mins[i]) / range) * 85;

        return `
          <div class="day-row" role="listitem">
            <span class="day-name ${i === 0 ? "day-name-today" : "day-name-other"}">${day}</span>
            <span class="day-icon">${smallWeatherSVG(codes[i], true)}</span>
            <span class="day-desc">${desc}</span>
            <div class="day-bar-wrap">
              <div class="day-bar" style="left:${barLeft}%;width:${barWidth}%"></div>
            </div>
            <span class="day-lo">${toDisplay(mins[i], this.isCelsius)}</span>
            <span class="day-hi">${toDisplay(maxs[i], this.isCelsius)}</span>
          </div>
        `;
      })
      .join("");

    this.elements.daily.innerHTML = html;
  }

  // ── METRICS ──
  renderMetrics(data) {
    const { daily: daily0, current: cur } = data;
    const HUMIDITY_HIGH = 70;
    const HUMIDITY_LOW = 40;
    const UV_LOW = 3;
    const UV_MOD = 6;
    const UV_HIGH = 8;
    const VIS_EXCELLENT = 10;
    const VIS_GOOD = 5;

    // Humidity
    const h = cur.relative_humidity_2m;
    this.elements.humidity.textContent = h + "%";
    this.elements.humidityText.textContent =
      h > HUMIDITY_HIGH ? "Feels quite humid" : h < HUMIDITY_LOW ? "Dry air" : "Comfortable";
    this.elements.humidityBar.style.width = h + "%";

    // UV
    if (daily0.uv_index_max?.length) {
      const u = daily0.uv_index_max[0];
      this.elements.uv.textContent = u.toFixed(0);
      this.elements.uvLabel.textContent =
        u < UV_LOW ? "Low" : u < UV_MOD ? "Moderate" : u < UV_HIGH ? "High" : "Very High";
      const uvColor = u < UV_LOW ? "#4ade80" : u < UV_MOD ? "#facc15" : u < UV_HIGH ? "#fb923c" : "#f87171";
      this.elements.uvBar.style.background = uvColor;
      this.elements.uvBar.style.width = Math.min((u / 12) * 100, 100) + "%";
    }

    // Precipitation
    if (daily0.precipitation_probability_max?.length) {
      const p = daily0.precipitation_probability_max[0];
      this.elements.precipProb.textContent = p + "%";
      this.elements.precipText.textContent =
        p === 0 ? "No rain expected" : p < 40 ? "Low chance" : p < 70 ? "Showers possible" : "Rain likely";
      this.elements.precipBar.style.width = p + "%";
    }

    // Visibility
    if (data.hourly.visibility?.length) {
      const visKm = data.hourly.visibility[0] / 1000;
      this.elements.visibility.textContent = visKm >= VIS_EXCELLENT ? "10+ km" : visKm.toFixed(1) + " km";
      this.elements.visibilityText.textContent =
        visKm >= VIS_EXCELLENT ? "Excellent" : visKm >= VIS_GOOD ? "Good" : "Reduced";
    }

    // Wind max
    if (daily0.wind_speed_10m_max?.length) {
      this.elements.windSpeedBottom.textContent = toDisplayWind(daily0.wind_speed_10m_max[0], this.isCelsius);
      this.elements.windGustBottom.textContent = daily0.wind_gusts_10m_max?.[0]
        ? "Gusts " + toDisplayWind(daily0.wind_gusts_10m_max[0], this.isCelsius)
        : "--";
    }

    // Day type
    const t = daily0.temperature_2m_max[0];
    const p2 = daily0.precipitation_probability_max?.[0] ?? 0;
    let type = "Calm Day";
    let text = "Comfortable for most activities.";

    if (p2 > PRECIP_LIKELY) {
      type = "Rainy Day";
      text = "Carry an umbrella; rain likely.";
    } else if (t >= TEMP_HOT) {
      type = "Hot Day";
      text = "Stay hydrated; limit midday sun.";
    } else if (t <= TEMP_COOL) {
      type = "Cold Day";
      text = "Layer up before heading out.";
    } else if (p2 >= PRECIP_MODERATE) {
      type = "Cloudy Day";
      text = "Overcast; showers possible.";
    }

    this.elements.dayType.textContent = type;
    this.elements.dayTypeText.textContent = text;
  }

  // ── LIFESTYLE TIPS ──
  renderLifestyleTips(data) {
    const grid = this.elements.tipsGrid;
    if (!grid) return;

    const { current: cur, daily: daily0 } = data;
    const tips = buildTips({
      temp: cur.temperature_2m,
      humidity: cur.relative_humidity_2m,
      precipProb: daily0.precipitation_probability_max?.[0] ?? 0,
      uv: daily0.uv_index_max?.[0] ?? 0,
      windMax: daily0.wind_speed_10m_max?.[0] ?? cur.wind_speed_10m,
    });

    // Using map() to build tip cards (Module IX — Array Methods)
    grid.innerHTML = tips
      .map((tip) => {
        const { color, emoji } = getTipStyle(tip.rating);
        return `
          <div class="tip-card glass">
            <div class="tip-badge" style="background:${color}22;color:${color}">${emoji} ${tip.rating}</div>
            <div class="tip-title">${tip.title}</div>
            <div class="tip-text">${tip.text}</div>
          </div>
        `;
      })
      .join("");
  }

  // ── SUN ARC POSITION ──
  moveSun() {
    if (!this.sunriseUnix || !this.sunsetUnix || this.sunriseUnix === this.sunsetUnix) return;
    const now = Date.now() / 1000;
    const p = Math.max(0, Math.min(1, (now - this.sunriseUnix) / (this.sunsetUnix - this.sunriseUnix)));
    const angle = p * Math.PI;
    const cx = 50 + 45 * Math.cos(Math.PI - angle);
    const cy = 48 - 45 * Math.sin(angle);

    if (this.elements.sunDot) {
      this.elements.sunDot.setAttribute("cx", cx);
      this.elements.sunDot.setAttribute("cy", cy);
    }
    if (this.elements.sunGlow) {
      this.elements.sunGlow.setAttribute("cx", cx);
      this.elements.sunGlow.setAttribute("cy", cy);
    }
    if (this.elements.sunProgress && p > 0) {
      const largeArc = p > 0.5 ? 1 : 0;
      this.elements.sunProgress.setAttribute(
        "d",
        `M5 48 A45 45 0 ${largeArc} 1 ${cx.toFixed(2)} ${cy.toFixed(2)}`
      );
    }
  }
}

/* ── INITIALIZE ON DOM READY ── */
document.addEventListener("DOMContentLoaded", () => {
  // Create the app (single instance)
  window.weatherApp = new WeatherApp();
});
