function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface RuntimeMetrics {
  frameSamples: number;
  averageFrameMs: number;
  p95FrameMs: number;
  worstFrameMs: number;
  estimatedFps: number;
  inputSamples: number;
  averageInputMs: number;
  p95InputMs: number;
  worstInputMs: number;
  droppedSimulationMs: number;
}

export class RuntimeTelemetry {
  private previousFrameAt: number | null = null;
  private readonly frameTimes: number[] = [];
  private readonly inputTimes: number[] = [];
  private pendingInputAt: number | null = null;
  private droppedSimulationMs = 0;

  recordFrame(now: number): void {
    if (this.previousFrameAt !== null) {
      const delta = now - this.previousFrameAt;
      if (delta > 0 && delta < 1_000) {
        this.frameTimes.push(delta);
        if (this.frameTimes.length > 600) {
          this.frameTimes.shift();
        }
      }
    }
    this.previousFrameAt = now;
  }

  queueInput(now: number): void {
    this.pendingInputAt = now;
  }

  applyPendingInput(now: number): void {
    if (this.pendingInputAt === null) {
      return;
    }
    this.inputTimes.push(Math.max(0, now - this.pendingInputAt));
    if (this.inputTimes.length > 120) {
      this.inputTimes.shift();
    }
    this.pendingInputAt = null;
  }

  addDroppedSimulation(seconds: number): void {
    this.droppedSimulationMs += seconds * 1_000;
  }

  resetFrames(): void {
    this.previousFrameAt = null;
    this.frameTimes.length = 0;
    this.droppedSimulationMs = 0;
  }

  snapshot(): RuntimeMetrics {
    const averageFrameMs = average(this.frameTimes);
    return {
      frameSamples: this.frameTimes.length,
      averageFrameMs,
      p95FrameMs: percentile(this.frameTimes, 0.95),
      worstFrameMs: Math.max(0, ...this.frameTimes),
      estimatedFps: averageFrameMs > 0 ? 1_000 / averageFrameMs : 0,
      inputSamples: this.inputTimes.length,
      averageInputMs: average(this.inputTimes),
      p95InputMs: percentile(this.inputTimes, 0.95),
      worstInputMs: Math.max(0, ...this.inputTimes),
      droppedSimulationMs: this.droppedSimulationMs,
    };
  }
}
