import {
  advanceGame,
  createGameState,
  pauseGame,
  resumeGame,
  setHeld,
  startGame,
  type GameEvent,
  type GameState,
  type PauseReason,
} from "./core/game";
import { FixedStepper } from "./core/fixed-step";
import { GameRenderer, type RenderSettings } from "./renderer";
import { RuntimeTelemetry, type RuntimeMetrics } from "./telemetry";

export interface DebugState {
  state: GameState;
  metrics: RuntimeMetrics;
  layout: ReturnType<GameRenderer["getLayout"]>;
}

export class GameRuntime {
  private state: GameState;
  private readonly stepper = new FixedStepper();
  private readonly telemetry = new RuntimeTelemetry();
  private animationFrame = 0;
  private previousFrameAt = performance.now();
  private latestAlpha = 0;
  private updateScheduledAt = 0;
  private orientationPauseGuardUntil = 0;

  constructor(
    seed: number,
    private readonly renderer: GameRenderer,
    private readonly renderSettings: () => RenderSettings,
    private readonly onUpdate: (state: GameState, events: GameEvent[]) => void,
  ) {
    this.state = createGameState(seed);
    this.renderer.reset(seed, this.state.player.position);
    this.animationFrame = requestAnimationFrame(this.frame);
    this.onUpdate(this.state, []);
  }

  private emit(events: GameEvent[]): void {
    if (events.length > 0) {
      this.onUpdate(this.state, events);
    }
  }

  private readonly frame = (now: number): void => {
    const frameSeconds = Math.max(0, (now - this.previousFrameAt) / 1_000);
    this.previousFrameAt = now;
    this.telemetry.recordFrame(now);

    if (this.state.mode === "playing") {
      let events: GameEvent[] = [];
      const result = this.stepper.advance(frameSeconds, (seconds) => {
        this.telemetry.applyPendingInput(performance.now());
        const stepEvents = advanceGame(this.state, seconds);
        this.renderer.recordPlayer(this.state.player.position);
        for (const event of stepEvents) {
          if (event.type === "pickup") {
            this.renderer.recordPickup(event.position);
          }
        }
        events = events.concat(stepEvents);
      });
      this.latestAlpha = result.alpha;
      this.telemetry.addDroppedSimulation(result.droppedSeconds);
      this.emit(events);
    } else {
      this.stepper.reset();
      this.latestAlpha = 0;
    }

    this.renderer.draw(this.state, this.latestAlpha, this.renderSettings());
    if (now - this.updateScheduledAt > 100) {
      this.updateScheduledAt = now;
      this.onUpdate(this.state, []);
    }
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  beginHold(): void {
    if (this.state.mode === "gameover") {
      this.reset(true);
    } else if (this.state.mode === "ready") {
      this.emit(startGame(this.state));
    } else if (this.state.mode === "paused") {
      this.emit(resumeGame(this.state));
    }

    this.telemetry.queueInput(performance.now());
    setHeld(this.state, true);
    this.onUpdate(this.state, []);
  }

  endHold(): void {
    this.telemetry.queueInput(performance.now());
    setHeld(this.state, false);
    this.onUpdate(this.state, []);
  }

  pause(reason: Exclude<PauseReason, null>): void {
    const events = pauseGame(this.state, reason);
    if (events.length > 0) {
      this.stepper.reset();
      this.emit(events);
    }
  }

  togglePause(): void {
    if (this.state.mode === "playing") {
      this.pause("manual");
    } else if (this.state.mode === "paused") {
      this.emit(resumeGame(this.state));
    }
  }

  pauseForOrientationChange(): void {
    const now = performance.now();
    if (now < this.orientationPauseGuardUntil) {
      return;
    }
    this.orientationPauseGuardUntil = now + 500;
    this.pause("rotation");
  }

  reset(startImmediately = false): void {
    const seed = this.state.seed;
    this.state = createGameState(seed);
    this.stepper.reset();
    this.renderer.reset(seed, this.state.player.position);
    if (startImmediately) {
      this.emit(startGame(this.state));
    }
    this.onUpdate(this.state, []);
  }

  getState(): GameState {
    return this.state;
  }

  getDebugState(): DebugState {
    return {
      state: structuredClone(this.state),
      metrics: this.telemetry.snapshot(),
      layout: { ...this.renderer.getLayout() },
    };
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrame);
  }
}
