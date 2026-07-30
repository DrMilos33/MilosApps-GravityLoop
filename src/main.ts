import "./styles.css";
import type {
  CelestialMode,
  Difficulty,
  GameEvent,
  GameState,
  PauseReason,
} from "./core/game";
import { localDateKey, seedFromDate } from "./core/rng";
import { InputController } from "./input";
import { GameRenderer, type RenderSettings } from "./renderer";
import { GameRuntime, type DebugState } from "./runtime";
import { SoundController } from "./sound";
import {
  DEFAULT_PROGRESS,
  loadProgress,
  saveProgress,
  type CelestialStyle,
  type CometSkin,
  type MotionPreference,
  type ProgressRecord,
} from "./storage";

declare global {
  interface Window {
    __gravityLoopTestApi?: {
      getDebugState: () => DebugState;
      reset: () => void;
      pause: () => void;
      resumeWithHold: () => void;
    };
  }
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`Element #${id} fehlt.`);
  }
  return found as T;
}

const canvas = element<HTMLCanvasElement>("game-canvas");
const overlay = element<HTMLDivElement>("game-overlay");
const overlayKicker = element<HTMLParagraphElement>("overlay-kicker");
const overlayTitle = element<HTMLHeadingElement>("overlay-title");
const overlayCopy = element<HTMLParagraphElement>("overlay-copy");
const overlayAction = element<HTMLButtonElement>("overlay-action");
const scoreValue = element<HTMLElement>("score-value");
const comboValue = element<HTMLElement>("combo-value");
const bestValue = element<HTMLElement>("best-value");
const pauseButton = element<HTMLButtonElement>("pause-button");
const restartButton = element<HTMLButtonElement>("restart-button");
const settingsButton = element<HTMLButtonElement>("settings-button");
const holdIndicator = element<HTMLDivElement>("hold-indicator");
const liveStatus = element<HTMLDivElement>("live-status");
const dailySeed = element<HTMLParagraphElement>("daily-seed");
const settingsDialog = element<HTMLDialogElement>("settings-dialog");
const soundSetting = element<HTMLInputElement>("sound-setting");
const motionSetting = element<HTMLSelectElement>("motion-setting");
const contrastSetting = element<HTMLInputElement>("contrast-setting");
const difficultySetting = element<HTMLSelectElement>("difficulty-setting");
const celestialModeSetting = element<HTMLSelectElement>("celestial-mode-setting");
const celestialStyleSetting = element<HTMLSelectElement>("celestial-style-setting");
const cometSkinSetting = element<HTMLSelectElement>("comet-skin-setting");
const resetProgressButton = element<HTMLButtonElement>("reset-progress-button");
const resetConfirmation = element<HTMLDivElement>("reset-confirmation");
const resetCancelButton = element<HTMLButtonElement>("reset-cancel-button");
const resetConfirmButton = element<HTMLButtonElement>("reset-confirm-button");

let progress: ProgressRecord = loadProgress(window.localStorage);
const today = new Date();
const dailySeedValue = seedFromDate(today);
const renderer = new GameRenderer(canvas, dailySeedValue);
const formattedToday = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(today);

const difficultyNames: Record<Difficulty, string> = {
  easy: "Leicht",
  normal: "Normal",
  hard: "Schwer",
};

const celestialNames: Record<CelestialMode, string> = {
  sun: "Sonnenorbit",
  moon: "Mondorbit",
};

function prefersReducedMotion(): boolean {
  if (progress.settings.motion === "reduce") {
    return true;
  }
  if (progress.settings.motion === "full") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function renderSettings(): RenderSettings {
  return {
    reducedMotion: prefersReducedMotion(),
    highContrast: progress.settings.highContrast,
    celestialStyle: progress.settings.celestialStyle,
    cometSkin: progress.settings.cometSkin,
  };
}

function save(): void {
  saveProgress(window.localStorage, progress);
}

function reasonCopy(reason: PauseReason): string {
  switch (reason) {
    case "hidden":
      return "Das Spiel pausiert, sobald der Tab nicht sichtbar ist.";
    case "rotation":
      return "Die Ausrichtung hat sich geändert. Deine Runde ist sicher pausiert.";
    case "focus":
      return "Ein anderes Fenster war im Vordergrund. Deine Runde ist sicher pausiert.";
    case "settings":
      return "Deine Runde wartet, während du Einstellungen änderst.";
    default:
      return "Atme kurz durch. Deine Position bleibt erhalten.";
  }
}

function gameOverCopy(state: GameState): string {
  switch (state.gameOverReason) {
    case "core":
      return state.options.celestialMode === "sun"
        ? "In die Sonne gezogen. Lass früher los – ihre Kraft steigt in der Nähe deutlich an."
        : "Auf dem Mond eingeschlagen. Lass früher los und nimm den sanften Schwung mit.";
    case "hazard":
      return "Ein Trabant kreuzte deine Bahn. Sein Ring zeigt dir den nächsten Weg.";
    default:
      return "Über den sicheren Rand hinaus. Halte etwas länger, um enger einzudrehen.";
  }
}

function updateOrbitContext(state: GameState): void {
  const isMoon = state.options.celestialMode === "moon";
  dailySeed.textContent = `${celestialNames[state.options.celestialMode]} · ${
    difficultyNames[state.options.difficulty]
  } · ${formattedToday} · ${localDateKey(today)}`;
  canvas.setAttribute(
    "aria-label",
    `Gravity Loop Spielfeld im ${isMoon ? "Mondmodus" : "Sonnenmodus"}. ` +
      `Schwierigkeit ${difficultyNames[state.options.difficulty]}. Halte mit Finger oder Maus ` +
      `oder halte die Leertaste, um den Kometen ${
        isMoon ? "zum Mond" : "zur Sonne"
      } zu lenken. ` +
      `Loslassen lässt ihn geradeaus fliegen. Eine Berührung mit ${
        isMoon ? "dem Mond" : "der Sonne"
      } beendet die Runde.`,
  );
}

function announceEvents(events: GameEvent[], state: GameState): void {
  for (const event of events) {
    if (event.type === "pickup") {
      liveStatus.textContent = `Lichtfunke ${event.collected} gesammelt. ${event.score} Punkte.`;
      sound.pickup(event.collected);
    } else if (event.type === "gameover") {
      liveStatus.textContent = `Runde beendet. ${event.score} Punkte, ${state.collected} Lichtfunken.`;
      sound.gameOver();
    } else if (event.type === "started") {
      liveStatus.textContent = "Flug gestartet.";
      sound.start();
    } else if (event.type === "paused") {
      liveStatus.textContent = "Spiel pausiert.";
    } else if (event.type === "resumed") {
      liveStatus.textContent = "Flug fortgesetzt.";
    }
  }
}

function updateUi(state: GameState, events: GameEvent[]): void {
  let storageChanged = false;
  if (state.collected > progress.bestSeries) {
    progress.bestSeries = state.collected;
    storageChanged = true;
  }
  if (state.mode === "gameover" && state.score > progress.bestScore) {
    progress.bestScore = state.score;
    storageChanged = true;
  }
  if (storageChanged) {
    save();
  }

  scoreValue.textContent = state.score.toLocaleString("de-DE");
  comboValue.textContent = state.collected.toLocaleString("de-DE");
  bestValue.textContent = progress.bestScore.toLocaleString("de-DE");
  holdIndicator.classList.toggle("is-active", state.held);
  canvas.classList.toggle("is-held", state.held);
  pauseButton.disabled = state.mode === "ready" || state.mode === "gameover";
  pauseButton.querySelector("span")!.textContent = state.mode === "paused" ? "Weiter" : "Pause";
  pauseButton.setAttribute("aria-pressed", state.mode === "paused" ? "true" : "false");
  updateOrbitContext(state);

  overlay.classList.toggle("is-hidden", state.mode === "playing");
  if (state.mode === "ready") {
    overlayKicker.textContent = `${difficultyNames[state.options.difficulty]} · ${
      celestialNames[state.options.celestialMode]
    }`;
    if (state.options.celestialMode === "moon") {
      overlayTitle.textContent = "Halten lenkt dich zum Mond.";
      overlayCopy.textContent =
        "Die Mondgravitation zieht sanfter und gleichmäßiger. Ein Einschlag beendet die Runde.";
    } else {
      overlayTitle.textContent = "Halten zieht dich zur Sonne.";
      overlayCopy.textContent =
        "Je näher du kommst, desto stärker zieht sie. Eine Berührung beendet die Runde.";
    }
    overlayAction.textContent = "Losfliegen";
  } else if (state.mode === "paused") {
    overlayKicker.textContent = "Sicher pausiert";
    overlayTitle.textContent = "Deine Bahn wartet.";
    overlayCopy.textContent = reasonCopy(state.pauseReason);
    overlayAction.textContent = "Weiterfliegen";
  } else if (state.mode === "gameover") {
    overlayKicker.textContent = `${state.score.toLocaleString("de-DE")} Punkte · ${state.collected} Funken`;
    overlayTitle.textContent =
      state.score >= progress.bestScore && state.score > 0 ? "Neuer Bestwert!" : "Fast im Rhythmus.";
    overlayCopy.textContent = gameOverCopy(state);
    overlayAction.textContent = "Nochmal";
  }

  announceEvents(events, state);
}

const sound = new SoundController(() => progress.settings.sound);
const runtime = new GameRuntime(
  dailySeedValue,
  renderer,
  renderSettings,
  updateUi,
  {
    difficulty: progress.settings.difficulty,
    celestialMode: progress.settings.celestialMode,
  },
);
const input = new InputController(canvas, runtime);

overlayAction.addEventListener("click", () => {
  runtime.beginHold();
  window.setTimeout(() => runtime.endHold(), 90);
  canvas.focus({ preventScroll: true });
});

pauseButton.addEventListener("click", () => {
  input.releaseAll();
  runtime.togglePause();
});

restartButton.addEventListener("click", () => {
  input.releaseAll();
  runtime.reset();
  canvas.focus({ preventScroll: true });
  liveStatus.textContent = "Runde neu gestartet.";
});

settingsButton.addEventListener("click", () => {
  input.releaseAll();
  runtime.pause("settings");
  soundSetting.checked = progress.settings.sound;
  motionSetting.value = progress.settings.motion;
  contrastSetting.checked = progress.settings.highContrast;
  difficultySetting.value = progress.settings.difficulty;
  celestialModeSetting.value = progress.settings.celestialMode;
  celestialStyleSetting.value = progress.settings.celestialStyle;
  cometSkinSetting.value = progress.settings.cometSkin;
  resetConfirmation.hidden = true;
  resetProgressButton.disabled = false;
  resetProgressButton.textContent = "Zurücksetzen";
  settingsDialog.showModal();
});

settingsDialog.addEventListener("close", () => {
  const difficulty = difficultySetting.value as Difficulty;
  const celestialMode = celestialModeSetting.value as CelestialMode;
  const gameplayChanged =
    runtime.getState().options.difficulty !== difficulty ||
    runtime.getState().options.celestialMode !== celestialMode;
  progress.settings.sound = soundSetting.checked;
  progress.settings.motion = motionSetting.value as MotionPreference;
  progress.settings.highContrast = contrastSetting.checked;
  progress.settings.difficulty = difficulty;
  progress.settings.celestialMode = celestialMode;
  progress.settings.celestialStyle =
    celestialStyleSetting.value as CelestialStyle;
  progress.settings.cometSkin = cometSkinSetting.value as CometSkin;
  document.documentElement.classList.toggle("high-contrast", progress.settings.highContrast);
  save();
  if (gameplayChanged) {
    runtime.configure({ difficulty, celestialMode });
    liveStatus.textContent = `${celestialNames[celestialMode]}, Schwierigkeit ${
      difficultyNames[difficulty]
    }. Die Runde wurde neu vorbereitet.`;
  }
  settingsButton.focus();
});

contrastSetting.addEventListener("change", () => {
  document.documentElement.classList.toggle("high-contrast", contrastSetting.checked);
});

resetProgressButton.addEventListener("click", () => {
  resetConfirmation.hidden = false;
  resetCancelButton.focus();
});

resetCancelButton.addEventListener("click", () => {
  resetConfirmation.hidden = true;
  resetProgressButton.focus();
});

resetConfirmButton.addEventListener("click", () => {
  progress = structuredClone(DEFAULT_PROGRESS);
  soundSetting.checked = progress.settings.sound;
  motionSetting.value = progress.settings.motion;
  contrastSetting.checked = progress.settings.highContrast;
  difficultySetting.value = progress.settings.difficulty;
  celestialModeSetting.value = progress.settings.celestialMode;
  celestialStyleSetting.value = progress.settings.celestialStyle;
  cometSkinSetting.value = progress.settings.cometSkin;
  document.documentElement.classList.remove("high-contrast");
  save();
  runtime.configure({
    difficulty: progress.settings.difficulty,
    celestialMode: progress.settings.celestialMode,
  });
  resetConfirmation.hidden = true;
  resetProgressButton.textContent = "Zurückgesetzt";
  resetProgressButton.disabled = true;
  liveStatus.textContent = "Alle lokalen Gravity-Loop-Daten wurden zurückgesetzt.";
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    input.releaseAll();
    runtime.pause("hidden");
  }
});

window.addEventListener("blur", () => {
  if (!settingsDialog.open) {
    input.releaseAll();
    runtime.pause("focus");
  }
});

window.addEventListener("pagehide", () => {
  input.releaseAll();
  runtime.pause("hidden");
  save();
});

if (screen.orientation) {
  screen.orientation.addEventListener("change", () => {
    input.releaseAll();
    runtime.pauseForOrientationChange();
  });
}

window.matchMedia("(orientation: portrait)").addEventListener("change", () => {
  input.releaseAll();
  runtime.pauseForOrientationChange();
});

document.documentElement.classList.toggle("high-contrast", progress.settings.highContrast);

const searchParameters = new URLSearchParams(window.location.search);
if (searchParameters.get("test") === "1") {
  window.__gravityLoopTestApi = {
    getDebugState: () => runtime.getDebugState(),
    reset: () => runtime.reset(),
    pause: () => runtime.pause("manual"),
    resumeWithHold: () => runtime.beginHold(),
  };
}
