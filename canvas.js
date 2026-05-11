/* =====================================================
   ATMOSPHÈRE WEATHER — canvas.js
   Canvas background animation as ES6 Class
   Demonstrates: Class, constructor, this, encapsulation
===================================================== */

/**
 * Particle — represents a single animated particle.
 * Demonstrates constructor function pattern (Module VI).
 */
class Particle {
  constructor(type, canvas) {
    this.x = Math.random() * canvas.width;
    this.phase = Math.random() * Math.PI * 2;
    this.alpha = 0;

    switch (type) {
      case "rain":
      case "storm":
        this.y = Math.random() * canvas.height;
        this.vx = -1 - Math.random();
        this.vy = 12 + Math.random() * 8;
        this.r = 0.5 + Math.random() * 0.5;
        this.alpha = 0.1 + Math.random() * 0.2;
        break;

      case "snow":
        this.y = Math.random() * canvas.height;
        this.vx = 0;
        this.vy = 0.5 + Math.random();
        this.r = 1 + Math.random() * 2;
        this.alpha = 0.3 + Math.random() * 0.4;
        break;

      default: // stars / clouds
        this.y = Math.random() * canvas.height * 0.6;
        this.r = 0.5 + Math.random() * 1;
        this.vx = 0.05 + Math.random() * 0.15;
        this.vy = 0;
        break;
    }
  }
}

/**
 * CanvasBackground — manages the animated weather background.
 * Demonstrates: ES6 Class with encapsulation (Module VIII).
 */
export class CanvasBackground {
  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {CanvasRenderingContext2D} */
  #ctx;
  /** @type {number|null} */
  #animationId = null;
  /** @type {Particle[]} */
  #particles = [];

  // Named constants for particle counts
  static RAIN_PARTICLES = 120;
  static SNOW_PARTICLES = 60;
  static STORM_PARTICLES = 80;
  static DEFAULT_PARTICLES = 30;

  /**
   * @param {string} canvasId - The ID of the canvas element
   */
  constructor(canvasId) {
    this.#canvas = document.getElementById(canvasId);
    this.#ctx = this.#canvas.getContext("2d");
    this.#resize();

    // Bind resize with debounced handler
    this._boundResize = this.#resize.bind(this);
    window.addEventListener("resize", this._boundResize);
  }

  /** Resize canvas to fill viewport */
  #resize() {
    this.#canvas.width = window.innerWidth;
    this.#canvas.height = window.innerHeight;
  }

  /**
   * Classify weather code into animation type.
   * @param {number} code - WMO weather code
   * @returns {{ isRain: boolean, isSnow: boolean, isStorm: boolean, isClear: boolean, isCloudy: boolean }}
   */
  #classifyWeather(code) {
    return {
      isRain: (code >= 51 && code <= 67) || (code >= 80 && code <= 82),
      isSnow: code >= 71 && code <= 77,
      isStorm: code >= 95,
      isClear: code === 0 || code === 1,
      isCloudy: code === 2 || code === 3,
    };
  }

  /**
   * Start the background animation for the given weather code.
   * @param {number} weatherCode
   */
  start(weatherCode) {
    // Stop any existing animation
    this.stop();

    const { isRain, isSnow, isStorm, isClear, isCloudy } =
      this.#classifyWeather(weatherCode);

    // Determine particle type and count
    let type = "default";
    let count = CanvasBackground.DEFAULT_PARTICLES;

    if (isRain) { type = "rain"; count = CanvasBackground.RAIN_PARTICLES; }
    else if (isSnow) { type = "snow"; count = CanvasBackground.SNOW_PARTICLES; }
    else if (isStorm) { type = "storm"; count = CanvasBackground.STORM_PARTICLES; }

    // Create particles using Array.from + map (Module IX)
    this.#particles = Array.from(
      { length: count },
      () => new Particle(type, this.#canvas)
    );

    const canvas = this.#canvas;
    const ctx = this.#ctx;
    const particles = this.#particles;

    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base gradient
      const grd = ctx.createRadialGradient(
        canvas.width * 0.5, 0, 0,
        canvas.width * 0.5, canvas.height * 0.7, canvas.height
      );

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
        particles.forEach((p) => {
          p.alpha = 0.3 + 0.4 * Math.sin(Date.now() * 0.001 + p.phase);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,220,255,${p.alpha})`;
          ctx.fill();
        });
      }

      // Clouds
      if (isCloudy || isRain || isStorm) {
        particles.forEach((p) => {
          p.x += p.vx;
          if (p.x > canvas.width + 120) p.x = -120;
          ctx.save();
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = isStorm ? "#6644aa" : "#8899cc";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Rain
      if (isRain || isStorm) {
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
          ctx.strokeStyle = isStorm
            ? `rgba(180,140,255,${p.alpha})`
            : `rgba(120,180,255,${p.alpha})`;
          ctx.lineWidth = p.r;
          ctx.stroke();
        });
      }

      // Snow
      if (isSnow) {
        particles.forEach((p) => {
          p.x += Math.sin(Date.now() * 0.0005 + p.phase) * 0.5;
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

      this.#animationId = requestAnimationFrame(frame);
    };

    frame();
  }

  /** Stop the animation */
  stop() {
    if (this.#animationId !== null) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }
  }

  /** Cleanup — remove event listeners */
  destroy() {
    this.stop();
    window.removeEventListener("resize", this._boundResize);
  }
}
