import { distancePointToSegment, magnitude, normalize, wrapAngle, type Vector } from "./math";
import { nextRandom, normalizeSeed } from "./rng";

export const ARENA_RADIUS = 1;
export const CORE_RADIUS = 0.135;
export const PLAYER_RADIUS = 0.035;
export const PICKUP_RADIUS = 0.047;
export const CONTROL_ACCELERATION = 0.82;
export const STARTING_SPEED = 0.68;

export type GameMode = "ready" | "playing" | "paused" | "gameover";
export type PauseReason = "manual" | "settings" | "hidden" | "rotation" | null;
export type GameOverReason = "core" | "edge" | "hazard" | null;

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
  player: Player;
  pickup: Pickup;
  hazards: Hazard[];
  held: boolean;
  score: number;
  pickupPoints: number;
  collected: number;
  impact: Vector | null;
}

export type GameEvent =
  | { type: "pickup"; score: number; collected: number; position: Vector }
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
  if (state.hazards.length >= 4) {
    return;
  }

  let candidate: Hazard | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const orbitRadius = 0.3 + random(state) * 0.48;
    const angle = random(state) * Math.PI * 2;
    const direction = state.hazards.length % 2 === 0 ? -1 : 1;
    const angularSpeed = direction * (0.16 + random(state) * 0.12);
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

export function createGameState(seed: number): GameState {
  const normalizedSeed = normalizeSeed(seed);
  const player: Player = {
    position: { x: -0.58, y: 0.16 },
    previousPosition: { x: -0.58, y: 0.16 },
    velocity: normalize({ x: 0.26, y: -0.94 }),
    radius: PLAYER_RADIUS,
  };
  player.velocity.x *= STARTING_SPEED;
  player.velocity.y *= STARTING_SPEED;

  const state: GameState = {
    mode: "ready",
    pauseReason: null,
    gameOverReason: null,
    seed: normalizedSeed,
    rngState: normalizedSeed,
    elapsedSeconds: 0,
    stepCount: 0,
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
  state.score = Math.floor(state.elapsedSeconds * 12) + state.pickupPoints;
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
    player.velocity.x += towardCore.x * CONTROL_ACCELERATION * seconds;
    player.velocity.y += towardCore.y * CONTROL_ACCELERATION * seconds;
  }

  const maximumSpeed = Math.min(0.86, STARTING_SPEED + Math.floor(state.collected / 4) * 0.025);
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
    CORE_RADIUS + player.radius
  ) {
    return endGame(state, "core", { ...player.position });
  }

  for (const hazard of state.hazards) {
    const position = hazardPosition(hazard);
    if (
      distancePointToSegment(position, player.previousPosition, player.position) <=
      hazard.radius + player.radius
    ) {
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
    const multiplier = Math.min(2.5, 1 + Math.floor((state.collected - 1) / 3) * 0.25);
    state.pickupPoints += Math.round(100 * multiplier);
    state.pickup = spawnPickup(state);
    if (state.collected % 3 === 0) {
      spawnHazard(state);
    }
    updateScore(state);
    events.push({
      type: "pickup",
      score: state.score,
      collected: state.collected,
      position: collectedPosition,
    });
  }

  return events;
}

export function getHazardPosition(hazard: Hazard): Vector {
  return hazardPosition(hazard);
}
