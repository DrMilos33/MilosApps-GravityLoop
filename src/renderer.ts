import {
  ARENA_RADIUS,
  getHazardPosition,
  type GameState,
} from "./core/game";
import { nextRandom } from "./core/rng";
import type { Vector } from "./core/math";
import type { CelestialStyle, CometSkin } from "./storage";

interface Layout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  scale: number;
  dpr: number;
}

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

interface Pulse {
  position: Vector;
  age: number;
  kind: "pickup" | "shield";
}

interface SurfaceMark {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface RenderSettings {
  reducedMotion: boolean;
  highContrast: boolean;
  celestialStyle: CelestialStyle;
  cometSkin: CometSkin;
}

interface CometPalette {
  body: string;
  edge: string;
  glow: string;
  tail: string;
  trail: string;
}

const COMET_PALETTES: Record<CometSkin, CometPalette> = {
  mint: {
    body: "#ddfffb",
    edge: "#8de9e0",
    glow: "#baf9f2",
    tail: "108, 232, 222",
    trail: "104, 220, 211",
  },
  ember: {
    body: "#fff0c2",
    edge: "#ff956d",
    glow: "#ffb468",
    tail: "255, 125, 82",
    trail: "255, 153, 100",
  },
  ice: {
    body: "#f2fbff",
    edge: "#8fc7ff",
    glow: "#9ce6ff",
    tail: "103, 194, 255",
    trail: "111, 196, 255",
  },
  hat: {
    body: "#fff7de",
    edge: "#9de9dc",
    glow: "#d8fff8",
    tail: "112, 226, 209",
    trail: "109, 222, 204",
  },
};

function mix(left: number, right: number, alpha: number): number {
  return left + (right - left) * alpha;
}

export class GameRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly staticCanvas = document.createElement("canvas");
  private readonly staticContext: CanvasRenderingContext2D;
  private staticContrast: boolean | null = null;
  private layout: Layout = {
    width: 1,
    height: 1,
    centerX: 0.5,
    centerY: 0.5,
    scale: 1,
    dpr: 1,
  };
  private readonly backgroundStars: BackgroundStar[] = [];
  private readonly surfaceMarks: SurfaceMark[] = [];
  private readonly trail: Vector[] = [];
  private readonly pulses: Pulse[] = [];
  private resizeObserver: ResizeObserver;
  private previousRenderedAt = performance.now();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    seed: number,
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt.");
    }
    this.context = context;
    const staticContext = this.staticCanvas.getContext("2d", { alpha: false });
    if (!staticContext) {
      throw new Error("Statische Canvas-Ebene konnte nicht initialisiert werden.");
    }
    this.staticContext = staticContext;
    this.buildStarField(seed);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private buildStarField(seed: number): void {
    let randomState = seed;
    this.backgroundStars.length = 0;
    for (let index = 0; index < 56; index += 1) {
      const xResult = nextRandom(randomState);
      randomState = xResult.state;
      const yResult = nextRandom(randomState);
      randomState = yResult.state;
      const radiusResult = nextRandom(randomState);
      randomState = radiusResult.state;
      const alphaResult = nextRandom(randomState);
      randomState = alphaResult.state;
      this.backgroundStars.push({
        x: xResult.value,
        y: yResult.value,
        radius: 0.45 + radiusResult.value * 1.15,
        alpha: 0.14 + alphaResult.value * 0.32,
      });
    }
    this.surfaceMarks.length = 0;
    for (let index = 0; index < 12; index += 1) {
      const angleResult = nextRandom(randomState);
      randomState = angleResult.state;
      const distanceResult = nextRandom(randomState);
      randomState = distanceResult.state;
      const radiusResult = nextRandom(randomState);
      randomState = radiusResult.state;
      const alphaResult = nextRandom(randomState);
      randomState = alphaResult.state;
      const angle = angleResult.value * Math.PI * 2;
      const distance = Math.sqrt(distanceResult.value) * 0.72;
      this.surfaceMarks.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        radius: 0.07 + radiusResult.value * 0.14,
        alpha: 0.12 + alphaResult.value * 0.18,
      });
    }
    this.staticContrast = null;
  }

  reset(seed: number, playerPosition: Vector): void {
    this.buildStarField(seed);
    this.trail.length = 0;
    this.trail.push({ ...playerPosition });
    this.pulses.length = 0;
  }

  recordPlayer(position: Vector): void {
    this.trail.push({ ...position });
    if (this.trail.length > 80) {
      this.trail.shift();
    }
  }

  recordPickup(position: Vector): void {
    this.pulses.push({ position: { ...position }, age: 0, kind: "pickup" });
  }

  recordShield(position: Vector): void {
    this.pulses.push({ position: { ...position }, age: 0, kind: "shield" });
  }

  getLayout(): Readonly<Layout> {
    return this.layout;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.staticCanvas.width = pixelWidth;
      this.staticCanvas.height = pixelHeight;
      this.staticContrast = null;
    }

    this.layout = {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      scale: Math.min(width, height) * 0.445,
      dpr,
    };
  }

  private worldToCanvas(position: Vector): Vector {
    return {
      x: this.layout.centerX + position.x * this.layout.scale,
      y: this.layout.centerY + position.y * this.layout.scale,
    };
  }

  private ensureStaticLayer(highContrast: boolean): void {
    if (
      this.staticContrast === highContrast &&
      this.staticCanvas.width === this.canvas.width &&
      this.staticCanvas.height === this.canvas.height
    ) {
      return;
    }

    if (
      this.staticCanvas.width !== this.canvas.width ||
      this.staticCanvas.height !== this.canvas.height
    ) {
      this.staticCanvas.width = this.canvas.width;
      this.staticCanvas.height = this.canvas.height;
    }
    this.staticContext.setTransform(1, 0, 0, 1, 0, 0);
    this.staticContext.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    this.staticContext.setTransform(this.layout.dpr, 0, 0, this.layout.dpr, 0, 0);
    this.drawBackground(this.staticContext, highContrast);
    this.drawArena(this.staticContext, highContrast);
    this.staticContrast = highContrast;
  }

  private beginFrame(highContrast: boolean): CanvasRenderingContext2D {
    this.ensureStaticLayer(highContrast);
    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.drawImage(this.staticCanvas, 0, 0);
    context.setTransform(this.layout.dpr, 0, 0, this.layout.dpr, 0, 0);
    return context;
  }

  private drawBackground(context: CanvasRenderingContext2D, highContrast: boolean): void {
    const gradient = context.createRadialGradient(
      this.layout.width * 0.5,
      this.layout.height * 0.42,
      0,
      this.layout.width * 0.5,
      this.layout.height * 0.5,
      Math.max(this.layout.width, this.layout.height) * 0.78,
    );
    gradient.addColorStop(0, highContrast ? "#102f42" : "#112a3b");
    gradient.addColorStop(0.54, highContrast ? "#071827" : "#091827");
    gradient.addColorStop(1, "#050b14");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.layout.width, this.layout.height);

    for (const star of this.backgroundStars) {
      context.globalAlpha = highContrast ? Math.min(0.72, star.alpha * 1.45) : star.alpha;
      context.fillStyle = "#d9f8f5";
      context.beginPath();
      context.arc(
        star.x * this.layout.width,
        star.y * this.layout.height,
        star.radius,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.globalAlpha = 1;
  }

  private drawArena(context: CanvasRenderingContext2D, highContrast: boolean): void {
    const radius = ARENA_RADIUS * this.layout.scale;
    const arenaGradient = context.createRadialGradient(
      this.layout.centerX,
      this.layout.centerY,
      radius * 0.18,
      this.layout.centerX,
      this.layout.centerY,
      radius,
    );
    arenaGradient.addColorStop(0, "rgba(255, 180, 95, 0.045)");
    arenaGradient.addColorStop(0.66, "rgba(115, 217, 212, 0.025)");
    arenaGradient.addColorStop(1, "rgba(109, 226, 217, 0.095)");
    context.fillStyle = arenaGradient;
    context.beginPath();
    context.arc(this.layout.centerX, this.layout.centerY, radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = highContrast ? 3 : 1.5;
    context.strokeStyle = highContrast ? "rgba(165, 255, 244, 0.82)" : "rgba(132, 234, 226, 0.42)";
    context.setLineDash([2, 8]);
    context.lineCap = "round";
    context.beginPath();
    context.arc(this.layout.centerX, this.layout.centerY, radius, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  }

  private drawCore(
    context: CanvasRenderingContext2D,
    state: GameState,
    settings: RenderSettings,
  ): void {
    const isMoon = state.options.celestialMode === "moon";
    const baseRadius = state.coreRadius * this.layout.scale;
    const breathe =
      settings.reducedMotion || isMoon
        ? 0
        : Math.sin(state.elapsedSeconds * 2.1) * baseRadius * 0.035;
    const radius = baseRadius + breathe;
    const glow = context.createRadialGradient(
      this.layout.centerX,
      this.layout.centerY,
      radius * 0.2,
      this.layout.centerX,
      this.layout.centerY,
      radius * 2.25,
    );
    if (isMoon) {
      glow.addColorStop(0, settings.highContrast ? "#f8fdff" : "#dcecff");
      glow.addColorStop(0.3, "rgba(167, 203, 222, 0.52)");
      glow.addColorStop(0.72, "rgba(95, 134, 161, 0.2)");
      glow.addColorStop(1, "rgba(95, 134, 161, 0)");
    } else {
      glow.addColorStop(0, settings.highContrast ? "#fff3c7" : "#ffe4ae");
      glow.addColorStop(0.28, "#ffb45f");
      glow.addColorStop(0.7, "rgba(237, 111, 95, 0.32)");
      glow.addColorStop(1, "rgba(237, 111, 95, 0)");
    }
    context.fillStyle = glow;
    context.beginPath();
    context.arc(this.layout.centerX, this.layout.centerY, radius * 2.25, 0, Math.PI * 2);
    context.fill();

    const surface = context.createRadialGradient(
      this.layout.centerX - radius * 0.34,
      this.layout.centerY - radius * 0.38,
      radius * 0.08,
      this.layout.centerX,
      this.layout.centerY,
      radius,
    );
    if (isMoon) {
      surface.addColorStop(0, settings.highContrast ? "#ffffff" : "#edf3f1");
      surface.addColorStop(0.52, "#b9c4c5");
      surface.addColorStop(1, settings.highContrast ? "#566575" : "#65717c");
    } else {
      surface.addColorStop(0, "#fff5b8");
      surface.addColorStop(0.48, "#ffbe55");
      surface.addColorStop(1, settings.highContrast ? "#e9653f" : "#e86e45");
    }
    context.fillStyle = surface;
    context.beginPath();
    context.arc(this.layout.centerX, this.layout.centerY, radius, 0, Math.PI * 2);
    context.fill();

    if (settings.celestialStyle === "natural") {
      context.save();
      context.beginPath();
      context.arc(this.layout.centerX, this.layout.centerY, radius * 0.96, 0, Math.PI * 2);
      context.clip();
      for (const mark of this.surfaceMarks) {
        const x = this.layout.centerX + mark.x * radius;
        const y = this.layout.centerY + mark.y * radius;
        const markRadius = mark.radius * radius;
        const markGradient = context.createRadialGradient(
          x - markRadius * 0.28,
          y - markRadius * 0.3,
          markRadius * 0.08,
          x,
          y,
          markRadius,
        );
        if (isMoon) {
          markGradient.addColorStop(0, `rgba(244, 248, 246, ${mark.alpha + 0.08})`);
          markGradient.addColorStop(0.38, `rgba(102, 114, 121, ${mark.alpha})`);
          markGradient.addColorStop(1, "rgba(64, 75, 84, 0)");
        } else {
          markGradient.addColorStop(0, `rgba(255, 245, 166, ${mark.alpha})`);
          markGradient.addColorStop(0.62, `rgba(172, 63, 45, ${mark.alpha})`);
          markGradient.addColorStop(1, "rgba(172, 63, 45, 0)");
        }
        context.fillStyle = markGradient;
        context.beginPath();
        context.ellipse(
          x,
          y,
          markRadius,
          markRadius * (isMoon ? 0.82 : 0.48),
          mark.x * 3.1,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.restore();
    } else if (isMoon) {
      context.fillStyle = "rgba(72, 86, 98, 0.24)";
      for (const mark of this.surfaceMarks.slice(0, 4)) {
        context.beginPath();
        context.arc(
          this.layout.centerX + mark.x * radius,
          this.layout.centerY + mark.y * radius,
          mark.radius * radius * 0.72,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }

    context.lineWidth = settings.highContrast ? 3 : 1.5;
    context.strokeStyle = isMoon
      ? settings.highContrast
        ? "#ffffff"
        : "rgba(224, 239, 242, 0.72)"
      : settings.highContrast
        ? "#fff8df"
        : "rgba(255, 248, 223, 0.72)";
    context.stroke();
  }

  private drawTrail(context: CanvasRenderingContext2D, settings: RenderSettings): void {
    if (this.trail.length < 2) {
      return;
    }
    const first = this.worldToCanvas(this.trail[0] ?? { x: 0, y: 0 });
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = 1; index < this.trail.length; index += 1) {
      const point = this.worldToCanvas(this.trail[index] ?? this.trail[0] ?? { x: 0, y: 0 });
      context.lineTo(point.x, point.y);
    }
    context.lineWidth = settings.highContrast ? 3 : 2;
    const palette = COMET_PALETTES[settings.cometSkin];
    context.strokeStyle = settings.highContrast
      ? `rgba(${palette.trail}, 0.82)`
      : `rgba(${palette.trail}, 0.36)`;
    context.stroke();
  }

  private drawGravityTether(
    context: CanvasRenderingContext2D,
    playerPosition: Vector,
    celestialMode: GameState["options"]["celestialMode"],
    settings: RenderSettings,
  ): void {
    const player = this.worldToCanvas(playerPosition);
    const gradient = context.createLinearGradient(
      this.layout.centerX,
      this.layout.centerY,
      player.x,
      player.y,
    );
    gradient.addColorStop(
      0,
      celestialMode === "moon"
        ? "rgba(183, 219, 240, 0.38)"
        : "rgba(255, 190, 103, 0.28)",
    );
    gradient.addColorStop(1, settings.highContrast ? "rgba(152, 255, 244, 0.95)" : "rgba(125, 234, 224, 0.68)");
    context.strokeStyle = gradient;
    context.lineWidth = settings.highContrast ? 3 : 2;
    context.setLineDash([4, 8]);
    context.lineDashOffset = settings.reducedMotion ? 0 : -performance.now() * 0.025;
    context.beginPath();
    context.moveTo(this.layout.centerX, this.layout.centerY);
    context.lineTo(player.x, player.y);
    context.stroke();
    context.setLineDash([]);
  }

  private drawPickup(
    context: CanvasRenderingContext2D,
    state: GameState,
    settings: RenderSettings,
  ): void {
    const position = this.worldToCanvas(state.pickup.position);
    const rotation = settings.reducedMotion ? state.pickup.phase : state.pickup.phase + state.elapsedSeconds * 0.8;
    const outerRadius = state.pickup.radius * this.layout.scale;
    const innerRadius = outerRadius * 0.43;
    context.save();
    context.translate(position.x, position.y);
    context.rotate(rotation);
    context.shadowBlur = settings.highContrast ? 18 : 12;
    context.shadowColor = "#fff0a8";
    context.fillStyle = settings.highContrast ? "#fff8c9" : "#ffe78b";
    context.strokeStyle = "#fff8dc";
    context.lineWidth = settings.highContrast ? 2.2 : 1.2;
    context.beginPath();
    for (let point = 0; point < 12; point += 1) {
      const angle = (point / 12) * Math.PI * 2 - Math.PI / 2;
      const radius = point % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  private drawHazards(
    context: CanvasRenderingContext2D,
    state: GameState,
    settings: RenderSettings,
  ): void {
    for (const hazard of state.hazards) {
      const orbitRadius = hazard.orbitRadius * this.layout.scale;
      context.strokeStyle = settings.highContrast ? "rgba(255, 163, 158, 0.38)" : "rgba(238, 125, 121, 0.15)";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(this.layout.centerX, this.layout.centerY, orbitRadius, 0, Math.PI * 2);
      context.stroke();

      const position = this.worldToCanvas(getHazardPosition(hazard));
      const radius = hazard.radius * this.layout.scale;
      const gradient = context.createRadialGradient(
        position.x - radius * 0.3,
        position.y - radius * 0.35,
        radius * 0.1,
        position.x,
        position.y,
        radius,
      );
      gradient.addColorStop(0, "#9b6771");
      gradient.addColorStop(0.72, "#442b3f");
      gradient.addColorStop(1, "#24182a");
      context.fillStyle = gradient;
      context.strokeStyle = settings.highContrast ? "#ffaaa6" : "rgba(242, 148, 144, 0.72)";
      context.lineWidth = settings.highContrast ? 3 : 1.5;
      context.beginPath();
      context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  private drawPulses(
    context: CanvasRenderingContext2D,
    deltaSeconds: number,
    settings: RenderSettings,
  ): void {
    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];
      if (!pulse) {
        continue;
      }
      pulse.age += deltaSeconds;
      if (pulse.age > (settings.reducedMotion ? 0.25 : 0.55)) {
        this.pulses.splice(index, 1);
        continue;
      }
      const duration = settings.reducedMotion ? 0.25 : 0.55;
      const progress = pulse.age / duration;
      const position = this.worldToCanvas(pulse.position);
      context.globalAlpha = 1 - progress;
      context.strokeStyle =
        pulse.kind === "shield" ? "#9efff3" : "#fff0a4";
      context.lineWidth = settings.highContrast ? 4 : 2.5;
      context.beginPath();
      context.arc(position.x, position.y, (10 + progress * 42) * (settings.reducedMotion ? 0.55 : 1), 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  private drawPlayer(
    context: CanvasRenderingContext2D,
    state: GameState,
    position: Vector,
    settings: RenderSettings,
  ): void {
    const canvasPosition = this.worldToCanvas(position);
    const angle = Math.atan2(state.player.velocity.y, state.player.velocity.x);
    const radius = state.player.radius * this.layout.scale;
    const palette = COMET_PALETTES[settings.cometSkin];
    context.save();
    context.translate(canvasPosition.x, canvasPosition.y);
    if (state.shieldActive) {
      const shieldPulse = settings.reducedMotion
        ? 1
        : 1 + Math.sin(state.elapsedSeconds * 5.5) * 0.045;
      context.strokeStyle = settings.highContrast ? "#ffffff" : "#9efff3";
      context.fillStyle = settings.highContrast
        ? "rgba(213, 255, 249, 0.13)"
        : "rgba(94, 231, 220, 0.1)";
      context.lineWidth = settings.highContrast ? 3 : 2;
      context.shadowColor = "#76efe3";
      context.shadowBlur = settings.highContrast ? 16 : 11;
      context.beginPath();
      context.arc(0, 0, radius * 2.05 * shieldPulse, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
    }
    context.rotate(angle);

    const tailLength = radius * (settings.reducedMotion ? 1.45 : 1.8 + Math.sin(state.elapsedSeconds * 8) * 0.12);
    const tailGradient = context.createLinearGradient(-tailLength * 2, 0, radius, 0);
    tailGradient.addColorStop(0, `rgba(${palette.tail}, 0)`);
    tailGradient.addColorStop(0.48, `rgba(${palette.tail}, 0.42)`);
    tailGradient.addColorStop(1, `rgba(${palette.tail}, 0.96)`);
    context.fillStyle = tailGradient;
    context.beginPath();
    context.moveTo(radius * 0.45, 0);
    context.quadraticCurveTo(-tailLength * 0.6, -radius * 0.72, -tailLength * 2, 0);
    context.quadraticCurveTo(-tailLength * 0.6, radius * 0.72, radius * 0.45, 0);
    context.fill();

    context.shadowBlur = settings.highContrast ? 18 : 12;
    context.shadowColor = palette.glow;
    context.fillStyle = palette.body;
    context.strokeStyle = settings.highContrast ? "#ffffff" : palette.edge;
    context.lineWidth = settings.highContrast ? 3 : 1.6;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    if (settings.cometSkin === "hat") {
      context.shadowBlur = 0;
      context.fillStyle = "#f1c85f";
      context.strokeStyle = settings.highContrast ? "#ffffff" : "#713754";
      context.lineWidth = Math.max(1.2, radius * 0.1);
      context.beginPath();
      context.roundRect(
        -radius * 0.65,
        -radius * 2.18,
        radius * 1.3,
        radius * 1.12,
        radius * 0.12,
      );
      context.fill();
      context.stroke();
      context.fillStyle = "#713754";
      context.fillRect(
        -radius * 0.63,
        -radius * 1.42,
        radius * 1.26,
        radius * 0.23,
      );
      context.fillStyle = "#f1c85f";
      context.beginPath();
      context.roundRect(
        -radius * 1.08,
        -radius * 1.18,
        radius * 2.16,
        radius * 0.3,
        radius * 0.1,
      );
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  draw(state: GameState, alpha: number, settings: RenderSettings): void {
    const context = this.beginFrame(settings.highContrast);
    const now = performance.now();
    const deltaSeconds = Math.min(0.1, Math.max(0, (now - this.previousRenderedAt) / 1_000));
    this.previousRenderedAt = now;
    const interpolatedPosition = {
      x: mix(state.player.previousPosition.x, state.player.position.x, alpha),
      y: mix(state.player.previousPosition.y, state.player.position.y, alpha),
    };

    this.drawTrail(context, settings);
    this.drawHazards(context, state, settings);
    if (state.held) {
      this.drawGravityTether(
        context,
        interpolatedPosition,
        state.options.celestialMode,
        settings,
      );
    }
    this.drawCore(context, state, settings);
    this.drawPickup(context, state, settings);
    this.drawPulses(context, deltaSeconds, settings);
    this.drawPlayer(context, state, interpolatedPosition, settings);
  }
}
