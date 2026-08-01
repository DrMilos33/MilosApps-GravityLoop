import type { GameRuntime } from "./runtime";

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button, a, input, select, textarea, label, dialog, summary, [contenteditable='true'], [data-no-gravity]",
      ),
    )
  );
}

export class InputController {
  private readonly activePointers = new Set<number>();
  private readonly activeKeys = new Set<string>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly touchSurface: HTMLElement,
    private readonly runtime: GameRuntime,
  ) {
    touchSurface.addEventListener("pointerdown", this.onPointerDown, {
      passive: false,
    });
    window.addEventListener("pointerup", this.onPointerEnd, true);
    window.addEventListener("pointercancel", this.onPointerEnd, true);
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
    if (
      (event.pointerType === "mouse" && event.target !== this.canvas) ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }
    if (this.activePointers.has(event.pointerId)) {
      return;
    }
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.activePointers.add(event.pointerId);
    try {
      this.touchSurface.setPointerCapture(event.pointerId);
    } catch {
      // Older embedded WebViews may reject capture; global cancel paths still release input.
    }
    this.syncHoldState();
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (!this.activePointers.delete(event.pointerId)) {
      return;
    }
    if (this.touchSurface.hasPointerCapture(event.pointerId)) {
      this.touchSurface.releasePointerCapture(event.pointerId);
    }
    this.syncHoldState();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isInteractiveTarget(event.target)) {
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
    for (const pointerId of this.activePointers) {
      if (this.touchSurface.hasPointerCapture(pointerId)) {
        this.touchSurface.releasePointerCapture(pointerId);
      }
    }
    this.activePointers.clear();
    this.activeKeys.clear();
    this.runtime.endHold();
  };
}
