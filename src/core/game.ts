import { distancePointToSegment, magnitude, normalize, wrapAngle, type Vector } from "./math";
import { nextRandom, normalizeSeed } from "./rng";

export const ARENA_RADIUS = 1;
export const CORE_RADIUS = 0.135;
export const MOON_RADIUS = 0.15;
export const PLAYER_RADIUS = 0.035;
export const PICKUP_RADIUS = 0.047;
export const CONTROL_ACCELERATION = 0.82;
export const MOON_CONTROL_ACCELERATION = 0.55;
export const STARTING_SPEED = 0.68;

export type GameMode = "ready" | "playing" | "paused" | "gameover";
export type PauseReason = "manual" | "settings" | "hidden" | "focus" | "rotation" | null;
export type GameOverReason = "core" | "edge" | "hazard" | null;
export type Difficulty = "easy" | "normal" | "hard";
export type CelestialMode = "sun" | "moon";

export interface GameOptions {
  difficulty: Difficulty;
  celestialMode: CelestialMode;
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  difficulty: "normal",
  celestialMode: "sun",
};

interface DifficultyProfile {
  startingSpeed: number;
  maximumSpeed: number;
  gravityMultiplier: number;
  hazardEvery: number;
  maximumHazards: number;
  hazardSpeedMultiplier: number;
  scoreMultiplier: number;
}

const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    startingSpeed: 0.62,
    maximumSpeed: 0.8,
    gravityMultiplier: 0.9,
    hazardEvery: 4,
    maximumHazards: 2,
    hazardSpeedMultiplier: 0.84,
    scoreMultiplier: 0.85,
  },
  normal: {
    startingSpeed: STARTING_SPEED,
    maximumSpeed: 0.86,
    gravityMultiplier: 1,
    hazardEvery: 3,
    maximumHazards: 4,
    hazardSpeedMultiplier: 1,
    scoreMultiplier: 1,
  },
  hard: {
    startingSpeed: 0.73,
    maximumSpeed: 0.92,
    gravityMultiplier: 1.08,
    hazardEvery: 2,
    maximumHazards: 5,
    hazardSpeedMultiplier: 1.16,
    scoreMultiplier: 1.25,
  },
};

export interface Player {
  position: Vector;
  previousPosition: Vector;
  velocity: Vector;
  radius: number;
}

export interface Pickup {
  position: Vector;
  radius: number;
  phase: number;
}

export interface Hazard {
  orbitRadius: number;
  angle: number;
  angularSpeed: number;
  radius: number;
}

export interface GameState {
  mode: GameMode;
  pauseReason: PauseReason;
  gameOverReason: GameOverReason;
  seed: number;
  rngState: number;
  elapsedSeconds: number;
  stepCount: number;
  options: GameOptions;
  coreRadius: number;
  player: Player;
  pickup: Pickup;
  hazards: Hazard[];
  held: boolean;
  score: number;
  pickupPoints: number;
  collected: number;
  shieldCharge: number;
  shieldActive: boolean;
  impact: Vector | null;
}

export type GameEvent =
  | {
      type: "pickup";
      score: number;
      collected: number;
      position: Vector;
      shieldCharge: number;
      shieldActive: boolean;
    }
  | { type: "shield-used"; position: Vector }
  | { type: "gameover"; reason: Exclude<GameOverReason, null>; score: number }
  | { type: "started" }
  | { type: "paused"; reason: Exclude<PauseReason, null> }
  | { type: "resumed" };

function random(state: GameState): number {
  const result = nextRandom(state.rngState);
  state.rngState = result.state;
  return result.value;
}

function currentAngularDirection(state: GameState): number {
  const { position, velocity } = state.player;
  return position.x * velocity.y - position.y * velocity.x >= 0 ? 1 : -1;
}

function spawnPickup(state: GameState): Pickup {
  const playerAngle = Math.atan2(state.player.position.y, state.player.position.x);
  const direction = currentAngularDirection(state);
  const angle = playerAngle + direction * (0.7 + random(state) * 0.72);
  const orbitRadius = 0.4 + random(state) * 0.32;

  return {
    position: {
      x: Math.cos(angle) * orbitRadius,
      y: Math.sin(angle) * orbitRadius,
    },
    radius: PICKUP_RADIUS,
    phase: random(state) * Math.PI * 2,
  };
}

function hazardPosition(hazard: Hazard): Vector {
  return {
    x: Math.cos(hazard.angle) * hazard.orbitRadius,
    y: Math.sin(hazard.angle) * hazard.orbitRadius,
  };
}

function spawnHazard(state: GameState): void {
  const profile = DIFFICULTY_PROFILES[state.options.difficulty];
  if (state.hazards.length >= profile.maximumHazards) {
    return;
  }

  let candidate: Hazard | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const orbitRadius = 0.3 + random(state) * 0.48;
    const angle = random(state) * Math.PI * 2;
    const direction = state.hazards.length % 2 === 0 ? -1 : 1;
    const angularSpeed =
      direction *
      (0.16 + random(state) * 0.12) *
      profile.hazardSpeedMultiplier *
      (state.options.celestialMode === "moon" ? 0.82 : 1);
    const radius = 0.043 + random(state) * 0.014;
    const nextCandidate = { orbitRadius, angle, angularSpeed, radius };
    const position = hazardPosition(nextCandidate);
    const playerDistance = Math.hypot(
      position.x - state.player.position.x,
      position.y - state.player.position.y,
    );
    const pickupDistance = Math.hypot(
      position.x - state.pickup.position.x,
      position.y - state.pickup.position.y,
    );

    candidate = nextCandidate;
    if (playerDistance > 0.25 && pickupDistance > 0.2) {
      break;
    }
  }

  if (candidate) {
    state.hazards.push(candidate);
  }
}

export function createGameState(
  seed: number,
  options: GameOptions = DEFAULT_GAME_OPTIONS,
): GameState {
  const normalizedSeed = normalizeSeed(seed);
  const normalizedOptions = { ...options };
  const profile = DIFFICULTY_PROFILES[normalizedOptions.difficulty];
  const startingSpeed =
    profile.startingSpeed * (normalizedOptions.celestialMode === "moon" ? 0.94 : 1);
  const player: Player = {
    position: { x: -0.58, y: 0.16 },
    previousPosition: { x: -0.58, y: 0.16 },
    velocity: normalize({ x: 0.26, y: -0.94 }),
    radius: PLAYER_RADIUS,
  };
  player.velocity.x *= startingSpeed;
  player.velocity.y *= startingSpeed;

  const state: GameState = {
    mode: "ready",
    pauseReason: null,
    gameOverReason: null,
    seed: normalizedSeed,
    rngState: normalizedSeed,
    elapsedSeconds: 0,
    stepCount: 0,
    options: normalizedOptions,
    coreRadius:
      normalizedOptions.celestialMode === "moon" ? MOON_RADIUS : CORE_RADIUS,
    player,
    pickup: {
      position: { x: 0, y: 0 },
      radius: PICKUP_RADIUS,
      phase: 0,
    },
    hazards: [],
    held: false,
    score: 0,
    pickupPoints: 0,
    collected: 0,
    shieldCharge: 0,
    shieldActive: false,
    impact: null,
  };
  state.pickup = spawnPickup(state);
  return state;
}

export function startGame(state: GameState): GameEvent[] {
  if (state.mode !== "ready") {
    return [];
  }
  state.mode = "playing";
  state.pauseReason = null;
  return [{ type: "started" }];
}

export function pauseGame(
  state: GameState,
  reason: Exclude<PauseReason, null>,
): GameEvent[] {
  if (state.mode !== "playing") {
    return [];
  }
  state.mode = "paused";
  state.pauseReason = reason;
  state.held = false;
  return [{ type: "paused", reason }];
}

export function resumeGame(state: GameState): GameEvent[] {
  if (state.mode !== "paused") {
    return [];
  }
  state.mode = "playing";
  state.pauseReason = null;
  return [{ type: "resumed" }];
}

export function setHeld(state: GameState, held: boolean): void {
  state.held = state.mode === "playing" && held;
}

function endGame(
  state: GameState,
  reason: Exclude<GameOverReason, null>,
  impact: Vector,
): GameEvent[] {
  state.mode = "gameover";
  state.gameOverReason = reason;
  state.impact = impact;
  state.held = false;
  return [{ type: "gameover", reason, score: state.score }];
}

function updateScore(state: GameState): void {
  const profile = DIFFICULTY_PROFILES[state.options.difficulty];
  state.score =
    Math.floor(state.elapsedSeconds * 12 * profile.scoreMultiplier) +
    state.pickupPoints;
}

function controlAcceleration(state: GameState): number {
  const profile = DIFFICULTY_PROFILES[state.options.difficulty];
  if (state.options.celestialMode === "moon") {
    return MOON_CONTROL_ACCELERATION * profile.gravityMultiplier;
  }

  const distance = Math.max(0.28, magnitude(state.player.position));
  const solarPull = 0.54 + 0.175 / distance;
  return solarPull * profile.gravityMultiplier;
}

function useShieldAgainstHazard(
  state: GameState,
  position: Vector,
  radius: number,
): GameEvent[] {
  const player = state.player;
  let normal = normalize({
    x: player.position.x - position.x,
    y: player.position.y - position.y,
  });
  if (normal.x === 0 && normal.y === 0) {
    normal = normalize({
      x: player.previousPosition.x - position.x,
      y: player.previousPosition.y - position.y,
    });
  }
  if (normal.x === 0 && normal.y === 0) {
    normal = normalize({ x: -player.velocity.x, y: -player.velocity.y });
  }
  if (normal.x === 0 && normal.y === 0) {
    normal = { x: 1, y: 0 };
  }

  const separation = radius + player.radius + 0.012;
  player.position = {
    x: position.x + normal.x * separation,
    y: position.y + normal.y * separation,
  };
  player.previousPosition = { ...player.position };

  const incomingNormalSpeed =
    player.velocity.x * normal.x + player.velocity.y * normal.y;
  if (incomingNormalSpeed < 0) {
    player.velocity.x -= 1.8 * incomingNormalSpeed * normal.x;
    player.velocity.y -= 1.8 * incomingNormalSpeed * normal.y;
  }
  player.velocity.x += normal.x * 0.12;
  player.velocity.y += normal.y * 0.12;

  const profile = DIFFICULTY_PROFILES[state.options.difficulty];
  const maximumDeflectionSpeed = profile.maximumSpeed * 0.94;
  const deflectedSpeed = magnitude(player.velocity);
  if (deflectedSpeed > maximumDeflectionSpeed) {
    player.velocity.x =
      (player.velocity.x / deflectedSpeed) * maximumDeflectionSpeed;
    player.velocity.y =
      (player.velocity.y / deflectedSpeed) * maximumDeflectionSpeed;
  }

  state.shieldActive = false;
  return [{ type: "shield-used", position: { ...player.position } }];
}

export function advanceGame(state: GameState, seconds: number): GameEvent[] {
  if (state.mode !== "playing" || seconds <= 0 || !Number.isFinite(seconds)) {
    return [];
  }

  const events: GameEvent[] = [];
  const player = state.player;
  player.previousPosition = { ...player.position };

  if (state.held) {
    const towardCore = normalize({ x: -player.position.x, y: -player.position.y });
    const acceleration = controlAcceleration(state);
    player.velocity.x += towardCore.x * acceleration * seconds;
    player.velocity.y += towardCore.y * acceleration * seconds;
  }

  const profile = DIFFICULTY_PROFILES[state.options.difficulty];
  const modeSpeedMultiplier = state.options.celestialMode === "moon" ? 0.94 : 1;
  const maximumSpeed = Math.min(
    profile.maximumSpeed * modeSpeedMultiplier,
    profile.startingSpeed * modeSpeedMultiplier +
      Math.floor(state.collected / 4) * 0.025,
  );
  const speed = magnitude(player.velocity);
  if (speed > maximumSpeed) {
    player.velocity.x = (player.velocity.x / speed) * maximumSpeed;
    player.velocity.y = (player.velocity.y / speed) * maximumSpeed;
  }

  player.position.x += player.velocity.x * seconds;
  player.position.y += player.velocity.y * seconds;
  state.elapsedSeconds += seconds;
  state.stepCount += 1;

  for (const hazard of state.hazards) {
    hazard.angle = wrapAngle(hazard.angle + hazard.angularSpeed * seconds);
  }

  updateScore(state);

  const playerDistance = magnitude(player.position);
  if (playerDistance + player.radius >= ARENA_RADIUS) {
    return endGame(state, "edge", { ...player.position });
  }

  if (
    distancePointToSegment({ x: 0, y: 0 }, player.previousPosition, player.position) <=
    state.coreRadius + player.radius
  ) {
    return endGame(state, "core", { ...player.position });
  }

  for (const hazard of state.hazards) {
    const position = hazardPosition(hazard);
    if (
      distancePointToSegment(position, player.previousPosition, player.position) <=
      hazard.radius + player.radius
    ) {
      if (state.shieldActive) {
        return events.concat(
          useShieldAgainstHazard(state, position, hazard.radius),
        );
      }
      return endGame(state, "hazard", { ...player.position });
    }
  }

  if (
    distancePointToSegment(
      state.pickup.position,
      player.previousPosition,
      player.position,
    ) <=
    state.pickup.radius + player.radius
  ) {
    const collectedPosition = { ...state.pickup.position };
    state.collected += 1;
    if (!state.shieldActive) {
      state.shieldCharge += 1;
      if (state.shieldCharge >= 3) {
        state.shieldCharge = 0;
        state.shieldActive = true;
      }
    }
    const multiplier = Math.min(2.5, 1 + Math.floor((state.collected - 1) / 3) * 0.25);
    state.pickupPoints += Math.round(
      100 * multiplier * profile.scoreMultiplier,
    );
    state.pickup = spawnPickup(state);
    if (state.collected % profile.hazardEvery === 0) {
      spawnHazard(state);
    }
    updateScore(state);
    events.push({
      type: "pickup",
      score: state.score,
      collected: state.collected,
      position: collectedPosition,
      shieldCharge: state.shieldCharge,
      shieldActive: state.shieldActive,
    });
  }

  return events;
}

export function getHazardPosition(hazard: Hazard): Vector {
  return hazardPosition(hazard);
}
