import type { GameRuntime } from "./runtime";

function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, input, select, textarea, dialog"))
  );
}

export class InputController {
  private readonly activePointers = new Set<number>();
  private readonly activeKeys = new Set<string>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly runtime: GameRuntime,
  ) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerEnd);
    canvas.addEventListener("pointercancel", this.onPointerEnd);
    canvas.addEventListener("lostpointercapture", this.onPointerEnd);
    window.addEventListener("pointerup", this.onPointerEnd);
    window.addEventListener("pointercancel", this.onPointerEnd);
    canvas.addEventListener("contextmenu", this.preventContextMenu);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private syncHoldState(): void {
    if (this.activePointers.size > 0 || this.activeKeys.size > 0) {
      this.runtime.beginHold();
    } else {
      this.runtime.endHold();
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.activePointers.add(event.pointerId);
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Older embedded WebViews may reject capture; global cancel paths still release input.
    }
    this.syncHoldState();
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (!this.activePointers.delete(event.pointerId)) {
      return;
    }
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.syncHoldState();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isFormControl(event.target)) {
      return;
    }

    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      if (!event.repeat) {
        this.activeKeys.add(event.code);
        this.syncHoldState();
      }
      return;
    }

    if (!event.repeat && event.code === "KeyP") {
      event.preventDefault();
      this.releaseAll();
      this.runtime.togglePause();
      return;
    }

    if (!event.repeat && event.code === "KeyR") {
      event.preventDefault();
      this.releaseAll();
      this.runtime.reset();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== "Space" && event.code !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    this.activeKeys.delete(event.code);
    this.syncHoldState();
  };

  private readonly preventContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  readonly releaseAll = (): void => {
    this.activePointers.clear();
    this.activeKeys.clear();
    this.runtime.endHold();
  };
}
