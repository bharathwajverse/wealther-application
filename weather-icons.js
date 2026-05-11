/* =====================================================
   ATMOSPHÈRE WEATHER — weather-icons.js
   SVG weather icon generators
   Removed dead tinyWeatherSVG alias
===================================================== */

import { codeCategory } from "./utils.js";

// ── COLOR PALETTES ──
const BIG_ICON_COLORS = {
  sun: ["#fde68a", "#fbbf24"],
  moon: ["#e0e7ff", "#a5b4fc"],
  cloud: ["#cbd5e1", "#94a3b8"],
  "cloud-sun": ["#fde68a", "#94a3b8"],
  rain: ["#7dd3fc", "#3b82f6"],
  snow: ["#e0f2fe", "#bae6fd"],
  storm: ["#c4b5fd", "#7c3aed"],
  fog: ["#cbd5e1", "#94a3b8"],
};

const SMALL_ICON_COLORS = {
  sun: "#fbbf24",
  moon: "#a5b4fc",
  cloud: "#94a3b8",
  "cloud-sun": "#fbbf24",
  rain: "#60a5fa",
  snow: "#bae6fd",
  storm: "#a78bfa",
  fog: "#94a3b8",
};

// ── HELPER: generate sun ray lines ──
function sunRays(cx, cy, r1, r2, angles, strokeColor, strokeWidth = 2.5) {
  return angles.map((a) => {
    const rad = (a * Math.PI) / 180;
    const x1 = cx + r1 * Math.cos(rad);
    const y1 = cy + r1 * Math.sin(rad);
    const x2 = cx + r2 * Math.cos(rad);
    const y2 = cy + r2 * Math.sin(rad);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
  }).join("");
}

// ── BIG WEATHER SVG (hero icon) ──
export function bigWeatherSVG(code, isDay) {
  const cat = codeCategory(code, isDay);
  const col = BIG_ICON_COLORS[cat] || ["#fff", "#aaa"];

  const icons = {
    sun: `<svg viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="18" fill="${col[0]}" opacity=".9"/>
      <circle cx="40" cy="40" r="14" fill="${col[1]}"/>
      ${sunRays(40, 40, 24, 30, [0, 45, 90, 135, 180, 225, 270, 315], col[0])}
    </svg>`,

    moon: `<svg viewBox="0 0 80 80" fill="none">
      <path d="M52 18a24 24 0 1 1-24 44 18 18 0 0 0 24-44z" fill="${col[0]}" opacity=".85"/>
    </svg>`,

    cloud: `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 50H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[0]}" opacity=".85"/>
    </svg>`,

    "cloud-sun": `<svg viewBox="0 0 80 80" fill="none">
      <circle cx="30" cy="26" r="12" fill="${col[0]}" opacity=".75"/>
      ${sunRays(30, 26, 16, 21, [0, 60, 120, 180, 240, 300], col[0], 2)}
      <path d="M60 54H28a12 12 0 0 1 0-24 12 12 0 0 1 22-3 8 8 0 0 1 10 9 8 8 0 0 1 0 18z" fill="${col[1]}"/>
    </svg>`,

    rain: `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 42H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[1]}" opacity=".7"/>
      ${[[28, 52], [40, 60], [34, 68], [52, 56]].map(([x, y]) =>
      `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 8}" stroke="${col[0]}" stroke-width="2" stroke-linecap="round"/>`
    ).join("")}
    </svg>`,

    snow: `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 42H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[1]}" opacity=".6"/>
      ${[[28, 54], [40, 58], [34, 66], [52, 54]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="2.5" fill="${col[0]}" opacity=".8"/>`
    ).join("")}
    </svg>`,

    storm: `<svg viewBox="0 0 80 80" fill="none">
      <path d="M58 44H20a14 14 0 0 1 0-28 14 14 0 0 1 26-4 10 10 0 0 1 12 10 10 10 0 0 1 0 22z" fill="${col[1]}" opacity=".6"/>
      <path d="M44 50l-8 14h6l-6 10 16-18h-8l8-6z" fill="${col[0]}" opacity=".9"/>
    </svg>`,

    fog: `<svg viewBox="0 0 80 80" fill="none">
      ${[30, 38, 46, 54].map((y, i) =>
      `<line x1="${20 + i * 2}" y1="${y}" x2="${60 - i * 2}" y2="${y}" stroke="${col[0]}" stroke-width="3" stroke-linecap="round" opacity="${.8 - i * .15}"/>`
    ).join("")}
    </svg>`,
  };

  return icons[cat] || icons.cloud;
}

// ── SMALL WEATHER SVG (hourly + daily) ──
export function smallWeatherSVG(code, isDay) {
  const cat = codeCategory(code, isDay);
  const col = SMALL_ICON_COLORS[cat] || "#fff";

  const icons = {
    sun: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="5" fill="${col}"/>${sunRays(11, 11, 7, 10, [0, 60, 120, 180, 240, 300], col, 1.5)}</svg>`,

    moon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M16 5a9 9 0 1 1-9 16 7 7 0 0 0 9-16z" fill="${col}"/></svg>`,

    cloud: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 15H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".8"/></svg>`,

    "cloud-sun": `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="7" r="4" fill="${col}" opacity=".8"/><path d="M18 15H8a5 5 0 0 1 0-10 5 5 0 0 1 8-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/></svg>`,

    rain: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 12H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/><line x1="8" y1="15" x2="7" y2="19" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="15" x2="11" y2="19" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/></svg>`,

    snow: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 12H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/><circle cx="8" cy="17" r="1.5" fill="${col}"/><circle cx="12" cy="17" r="1.5" fill="${col}"/></svg>`,

    storm: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 12H6a5 5 0 0 1 0-10 5 5 0 0 1 9-1 3 3 0 0 1 2 5z" fill="${col}" opacity=".6"/><path d="M12 13l-3 5h2l-2 4 6-7h-3l3-2z" fill="${col}"/></svg>`,

    fog: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="4" y1="10" x2="18" y2="10" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="14" x2="16" y2="14" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };

  return icons[cat] || icons.cloud;
}
