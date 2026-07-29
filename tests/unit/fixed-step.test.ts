import { describe, expect, it } from "vitest";
import { FixedStepper, FIXED_STEP_SECONDS, MAX_FRAME_SECONDS } from "../../src/core/fixed-step";

function simulateAt(renderRate: number, seconds: number): number {
  const stepper = new FixedStepper();
  let steps = 0;
  for (let frame = 0; frame < renderRate * seconds; frame += 1) {
    stepper.advance(1 / renderRate, () => {
      steps += 1;
    });
  }
  return steps;
}

describe("fixed simulation step", () => {
  it.each([30, 60, 90, 120, 144])(
    "runs the same number of simulation ticks at %i Hz rendering",
    (renderRate) => {
      expect(simulateAt(renderRate, 12)).toBe(12 / FIXED_STEP_SECONDS);
    },
  );

  it("drops long background gaps instead of fast-forwarding the game", () => {
    const stepper = new FixedStepper();
    let steps = 0;
    const result = stepper.advance(2, () => {
      steps += 1;
    });

    expect(steps).toBe(Math.round(MAX_FRAME_SECONDS / FIXED_STEP_SECONDS));
    expect(result.droppedSeconds).toBeCloseTo(1.9, 8);
  });

  it("ignores invalid and negative frame durations", () => {
    const stepper = new FixedStepper();
    let steps = 0;
    stepper.advance(Number.NaN, () => {
      steps += 1;
    });
    stepper.advance(-1, () => {
      steps += 1;
    });
    expect(steps).toBe(0);
  });
});
