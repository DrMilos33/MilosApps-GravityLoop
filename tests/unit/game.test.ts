import { describe, expect, it } from "vitest";
import {
  CORE_RADIUS,
  MOON_RADIUS,
  PLAYER_RADIUS,
  advanceGame,
  createGameState,
  pauseGame,
  resumeGame,
  setHeld,
  startGame,
  type GameState,
} from "../../src/core/game";
import { FIXED_STEP_SECONDS, FixedStepper } from "../../src/core/fixed-step";

function runningState(seed = 41): GameState {
  const state = createGameState(seed);
  startGame(state);
  return state;
}

function accelerationAfterStep(
  celestialMode: "sun" | "moon",
  position: { x: number; y: number },
): number {
  const state = createGameState(73, { difficulty: "normal", celestialMode });
  state.player.position = { ...position };
  state.player.previousPosition = { ...position };
  state.player.velocity = { x: 0, y: 0 };
  startGame(state);
  setHeld(state, true);
  advanceGame(state, FIXED_STEP_SECONDS);
  return Math.hypot(state.player.velocity.x, state.player.velocity.y) / FIXED_STEP_SECONDS;
}

function simulatePattern(renderRate: number): GameState {
  const state = runningState(91_772);
  const stepper = new FixedStepper();
  for (let frame = 0; frame < renderRate * 5; frame += 1) {
    stepper.advance(1 / renderRate, (seconds) => {
      const elapsed = state.stepCount * FIXED_STEP_SECONDS;
      setHeld(
        state,
        (elapsed >= 0.2 && elapsed < 1.25) || (elapsed >= 2.1 && elapsed < 3.4),
      );
      advanceGame(state, seconds);
    });
  }
  return state;
}

describe("game state and physics", () => {
  it("curves toward the core only while held", () => {
    const coasting = runningState();
    const curving = runningState();
    const originalVelocity = { ...curving.player.velocity };
    setHeld(curving, true);

    advanceGame(coasting, FIXED_STEP_SECONDS);
    advanceGame(curving, FIXED_STEP_SECONDS);

    expect(coasting.player.velocity).toEqual(originalVelocity);
    const velocityChange = {
      x: curving.player.velocity.x - originalVelocity.x,
      y: curving.player.velocity.y - originalVelocity.y,
    };
    const towardCore = { x: 0.58, y: -0.16 };
    expect(velocityChange.x * towardCore.x + velocityChange.y * towardCore.y).toBeGreaterThan(0);
  });

  it("offers ordered difficulty profiles without changing the one-finger rule", () => {
    const easy = createGameState(41, { difficulty: "easy", celestialMode: "sun" });
    const normal = createGameState(41, { difficulty: "normal", celestialMode: "sun" });
    const hard = createGameState(41, { difficulty: "hard", celestialMode: "sun" });

    const speed = (state: GameState) =>
      Math.hypot(state.player.velocity.x, state.player.velocity.y);

    expect(speed(easy)).toBeLessThan(speed(normal));
    expect(speed(normal)).toBeLessThan(speed(hard));
    expect(easy.options).toEqual({ difficulty: "easy", celestialMode: "sun" });
    expect(hard.options).toEqual({ difficulty: "hard", celestialMode: "sun" });

    for (const state of [easy, normal, hard]) {
      const velocity = { ...state.player.velocity };
      startGame(state);
      advanceGame(state, FIXED_STEP_SECONDS);
      expect(state.player.velocity).toEqual(velocity);
    }
  });

  it("paces hazards and rewards according to the selected difficulty", () => {
    const easy = createGameState(44, { difficulty: "easy", celestialMode: "sun" });
    const normal = createGameState(44, { difficulty: "normal", celestialMode: "sun" });
    const hard = createGameState(44, { difficulty: "hard", celestialMode: "sun" });
    const states = [easy, normal, hard];
    states.forEach(startGame);

    const collectAtRest = (state: GameState) => {
      state.player.velocity = { x: 0, y: 0 };
      state.pickup.position = { ...state.player.position };
      advanceGame(state, FIXED_STEP_SECONDS);
    };

    for (let pickup = 0; pickup < 2; pickup += 1) {
      states.forEach(collectAtRest);
    }
    expect(easy.hazards).toHaveLength(0);
    expect(normal.hazards).toHaveLength(0);
    expect(hard.hazards).toHaveLength(1);
    expect(hard.score).toBeGreaterThan(normal.score);

    states.forEach(collectAtRest);
    expect(normal.hazards).toHaveLength(1);
    expect(easy.hazards).toHaveLength(0);

    states.forEach(collectAtRest);
    expect(easy.hazards).toHaveLength(1);
    expect(hard.hazards).toHaveLength(2);
  });

  it("uses a rising solar pull and a gentler, steadier lunar pull", () => {
    const nearSun = accelerationAfterStep("sun", { x: 0.32, y: 0 });
    const farSun = accelerationAfterStep("sun", { x: 0.72, y: 0 });
    const nearMoon = accelerationAfterStep("moon", { x: 0.32, y: 0 });
    const farMoon = accelerationAfterStep("moon", { x: 0.72, y: 0 });

    expect(nearSun).toBeGreaterThan(farSun * 1.15);
    expect(farSun).toBeGreaterThan(farMoon);
    expect(Math.abs(nearMoon - farMoon)).toBeLessThan(0.05);
  });

  it("produces equivalent outcomes at 30, 60 and high refresh rendering", () => {
    const at30 = simulatePattern(30);
    const at60 = simulatePattern(60);
    const at144 = simulatePattern(144);

    expect(at30.stepCount).toBe(at60.stepCount);
    expect(at144.stepCount).toBe(at60.stepCount);
    expect(at30.mode).toBe(at60.mode);
    expect(at144.mode).toBe(at60.mode);
    expect(at30.player.position.x).toBeCloseTo(at60.player.position.x, 10);
    expect(at144.player.position.y).toBeCloseTo(at60.player.position.y, 10);
    expect(at30.score).toBe(at144.score);
  });

  it("uses swept collision detection for the core", () => {
    const state = runningState();
    state.player.position = { x: -(CORE_RADIUS + PLAYER_RADIUS + 0.04), y: 0 };
    state.player.previousPosition = { ...state.player.position };
    state.player.velocity = { x: 1.5, y: 0 };

    const events = advanceGame(state, 0.2);

    expect(state.mode).toBe("gameover");
    expect(state.gameOverReason).toBe("core");
    expect(events).toContainEqual(expect.objectContaining({ type: "gameover", reason: "core" }));
  });

  it("ends the round on both a solar plunge and a lunar impact", () => {
    for (const [celestialMode, radius] of [
      ["sun", CORE_RADIUS],
      ["moon", MOON_RADIUS],
    ] as const) {
      const state = createGameState(92, { difficulty: "normal", celestialMode });
      startGame(state);
      state.player.position = { x: -(radius + PLAYER_RADIUS + 0.03), y: 0 };
      state.player.previousPosition = { ...state.player.position };
      state.player.velocity = { x: 1.2, y: 0 };

      const events = advanceGame(state, 0.15);

      expect(state.gameOverReason).toBe("core");
      expect(events).toContainEqual(
        expect.objectContaining({ type: "gameover", reason: "core" }),
      );
    }
  });

  it("detects the arena boundary and deterministic orbit hazards", () => {
    const boundary = runningState();
    boundary.player.position = { x: 0.97, y: 0 };
    boundary.player.previousPosition = { ...boundary.player.position };
    boundary.player.velocity = { x: 0.4, y: 0 };
    advanceGame(boundary, FIXED_STEP_SECONDS);
    expect(boundary.gameOverReason).toBe("edge");

    const hazard = runningState();
    hazard.player.position = { x: 0.5, y: 0 };
    hazard.player.previousPosition = { ...hazard.player.position };
    hazard.player.velocity = { x: 0, y: 0.2 };
    hazard.hazards = [{ orbitRadius: 0.5, angle: 0, angularSpeed: 0, radius: 0.05 }];
    advanceGame(hazard, FIXED_STEP_SECONDS);
    expect(hazard.gameOverReason).toBe("hazard");
  });

  it("collects a pickup, scores it and emits its original location", () => {
    const state = runningState();
    const collectedAt = {
      x: state.player.position.x + state.player.velocity.x * FIXED_STEP_SECONDS,
      y: state.player.position.y + state.player.velocity.y * FIXED_STEP_SECONDS,
    };
    state.pickup.position = collectedAt;

    const events = advanceGame(state, FIXED_STEP_SECONDS);

    expect(state.collected).toBe(1);
    expect(state.score).toBeGreaterThanOrEqual(100);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "pickup", collected: 1, position: collectedAt }),
    );
    expect(state.pickup.position).not.toEqual(collectedAt);
  });

  it("pauses without movement and resumes from the same deterministic state", () => {
    const state = runningState();
    setHeld(state, true);
    pauseGame(state, "hidden");
    const pausedPosition = structuredClone(state.player.position);

    expect(state.held).toBe(false);
    expect(advanceGame(state, 1)).toEqual([]);
    expect(state.player.position).toEqual(pausedPosition);
    expect(resumeGame(state)).toEqual([{ type: "resumed" }]);
    expect(state.mode).toBe("playing");
  });

  it("keeps rapid duplicate state transitions idempotent", () => {
    const state = createGameState(55);
    expect(startGame(state)).toHaveLength(1);
    expect(startGame(state)).toEqual([]);
    expect(pauseGame(state, "manual")).toHaveLength(1);
    expect(pauseGame(state, "manual")).toEqual([]);
    expect(resumeGame(state)).toHaveLength(1);
    expect(resumeGame(state)).toEqual([]);
  });

  it("supports a readable pulse rhythm for a sustained reference flight", () => {
    const state = runningState(91_772);
    let held = false;

    for (let step = 0; step < 120 * 60 && state.mode === "playing"; step += 1) {
      const radius = Math.hypot(state.player.position.x, state.player.position.y);
      const radialVelocity =
        (state.player.position.x * state.player.velocity.x +
          state.player.position.y * state.player.velocity.y) /
        radius;

      if (!held && radius > 0.69 && radialVelocity > 0.04) {
        held = true;
      } else if (held && (radius < 0.42 || radialVelocity < -0.26)) {
        held = false;
      }
      setHeld(state, held);
      advanceGame(state, FIXED_STEP_SECONDS);
    }

    expect(state.elapsedSeconds).toBeCloseTo(60, 8);
    expect(state.mode).toBe("playing");
    expect(state.collected).toBeGreaterThanOrEqual(1);
  });
});
