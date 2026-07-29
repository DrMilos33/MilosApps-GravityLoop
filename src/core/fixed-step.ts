export const FIXED_STEP_SECONDS = 1 / 120;
export const MAX_FRAME_SECONDS = 0.1;
const ACCUMULATOR_EPSILON = 1e-10;

export interface FixedStepResult {
  alpha: number;
  steps: number;
  droppedSeconds: number;
}

export class FixedStepper {
  private accumulator = 0;

  reset(): void {
    this.accumulator = 0;
  }

  advance(frameSeconds: number, step: (seconds: number) => void): FixedStepResult {
    const safeFrameSeconds = Number.isFinite(frameSeconds) ? Math.max(0, frameSeconds) : 0;
    const acceptedSeconds = Math.min(safeFrameSeconds, MAX_FRAME_SECONDS);
    const droppedSeconds = Math.max(0, safeFrameSeconds - acceptedSeconds);
    this.accumulator += acceptedSeconds;

    let steps = 0;
    while (this.accumulator + ACCUMULATOR_EPSILON >= FIXED_STEP_SECONDS) {
      step(FIXED_STEP_SECONDS);
      this.accumulator -= FIXED_STEP_SECONDS;
      if (this.accumulator < 0 && this.accumulator > -ACCUMULATOR_EPSILON) {
        this.accumulator = 0;
      }
      steps += 1;
    }

    return {
      alpha: this.accumulator / FIXED_STEP_SECONDS,
      steps,
      droppedSeconds,
    };
  }
}
