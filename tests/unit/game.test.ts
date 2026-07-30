import { describe, expect, it } from "vitest";
import {
  CORE_RADIUS,
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
