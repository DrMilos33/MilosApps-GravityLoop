import "./styles.css";
import type {
  CelestialMode,
  Difficulty,
  GameEvent,
  GameState,
} from "./core/game";
import { localDateKey, seedFromDate } from "./core/rng";
import {
  formatDate,
  formatNumber,
  getMessages,
  type Language,
  type StaticTranslationKey,
} from "./i18n";
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
      getLanguage: () => Language;
      getShellEnvironment: () => "dev";
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
const resetProgressLabel =
  resetProgressButton.querySelector<HTMLElement>("[data-i18n]");
const resetConfirmation = element<HTMLDivElement>("reset-confirmation");
const resetCancelButton = element<HTMLButtonElement>("reset-cancel-button");
const resetConfirmButton = element<HTMLButtonElement>("reset-confirm-button");
const metaDescription = document.querySelector<HTMLMetaElement>(
  'meta[name="description"]',
);

let progress: ProgressRecord = loadProgress(window.localStorage);
let language: Language = document.documentElement.lang === "en" ? "en" : "de";
const today = new Date();
const dailySeedValue = seedFromDate(today);

function applyStaticTranslations(): void {
  const messages = getMessages(language);
  document.documentElement.lang = language;
  document.title = messages.static.documentTitle;
  if (metaDescription) {
    metaDescription.content = messages.static.metaDescription;
  }

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (key && key in messages.static) {
      node.textContent = messages.static[key as StaticTranslationKey];
    }
  });
  document
    .querySelectorAll<HTMLElement>("[data-i18n-aria-label]")
    .forEach((node) => {
      const key = node.dataset.i18nAriaLabel;
      if (key && key in messages.static) {
        node.setAttribute(
          "aria-label",
          messages.static[key as StaticTranslationKey],
        );
      }
    });
}

applyStaticTranslations();

const renderer = new GameRenderer(canvas, dailySeedValue);

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

function updateOrbitContext(state: GameState): void {
  const messages = getMessages(language);
  dailySeed.textContent = messages.orbitCaption(
    messages.celestial[state.options.celestialMode],
    messages.difficulty[state.options.difficulty],
    formatDate(today, language),
    localDateKey(today),
  );
  canvas.setAttribute("aria-label", messages.canvasLabel(state));
}

function announceEvents(events: GameEvent[], state: GameState): void {
  const messages = getMessages(language);
  for (const event of events) {
    if (event.type === "pickup") {
      liveStatus.textContent = messages.pickupAnnouncement(
        formatNumber(event.collected, language),
        formatNumber(event.score, language),
      );
      sound.pickup(event.collected);
    } else if (event.type === "gameover") {
      liveStatus.textContent = messages.gameOverAnnouncement(
        formatNumber(event.score, language),
        formatNumber(state.collected, language),
      );
      sound.gameOver();
    } else if (event.type === "started") {
      liveStatus.textContent = messages.static.startedAnnouncement;
      sound.start();
    } else if (event.type === "paused") {
      liveStatus.textContent = messages.static.pausedAnnouncement;
    } else if (event.type === "resumed") {
      liveStatus.textContent = messages.static.resumedAnnouncement;
    }
  }
}

function updateUi(state: GameState, events: GameEvent[]): void {
  const messages = getMessages(language);
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

  scoreValue.textContent = formatNumber(state.score, language);
  comboValue.textContent = formatNumber(state.collected, language);
  bestValue.textContent = formatNumber(progress.bestScore, language);
  holdIndicator.classList.toggle("is-active", state.held);
  canvas.classList.toggle("is-held", state.held);
  pauseButton.disabled = state.mode === "ready" || state.mode === "gameover";
  pauseButton.querySelector("span")!.textContent =
    state.mode === "paused" ? messages.static.resume : messages.static.pause;
  pauseButton.setAttribute(
    "aria-pressed",
    state.mode === "paused" ? "true" : "false",
  );
  updateOrbitContext(state);

  overlay.classList.toggle("is-hidden", state.mode === "playing");
  if (state.mode === "ready") {
    overlayKicker.textContent = `${messages.difficulty[state.options.difficulty]} · ${
      messages.celestial[state.options.celestialMode]
    }`;
    if (state.options.celestialMode === "moon") {
      overlayTitle.textContent = messages.static.readyMoonTitle;
      overlayCopy.textContent = messages.static.readyMoonCopy;
    } else {
      overlayTitle.textContent = messages.static.readySunTitle;
      overlayCopy.textContent = messages.static.readySunCopy;
    }
    overlayAction.textContent = messages.static.launch;
  } else if (state.mode === "paused") {
    overlayKicker.textContent = messages.static.pausedKicker;
    overlayTitle.textContent = messages.static.pausedTitle;
    overlayCopy.textContent =
      messages.pauseReason[state.pauseReason ?? "default"];
    overlayAction.textContent = messages.static.continue;
  } else if (state.mode === "gameover") {
    overlayKicker.textContent = messages.gameOverKicker(
      formatNumber(state.score, language),
      formatNumber(state.collected, language),
    );
    overlayTitle.textContent =
      state.score >= progress.bestScore && state.score > 0
        ? messages.static.newBest
        : messages.static.almost;
    overlayCopy.textContent = messages.gameOverCopy(state);
    overlayAction.textContent = messages.static.again;
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

function changeLanguage(nextLanguage: Language, announce = true): void {
  if (nextLanguage === language) {
    return;
  }
  language = nextLanguage;
  applyStaticTranslations();
  updateUi(runtime.getState(), []);
  if (announce) {
    liveStatus.textContent = getMessages(language).static.languageChanged;
  }
}

window.addEventListener("milosapps:localechange", (event) => {
  const locale = (event as CustomEvent<{ locale?: string }>).detail?.locale;
  changeLanguage(locale === "en" ? "en" : "de");
});

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
  liveStatus.textContent =
    getMessages(language).static.restartedAnnouncement;
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
  if (resetProgressLabel) {
    resetProgressLabel.textContent = getMessages(language).static.reset;
  }
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
  document.documentElement.classList.toggle(
    "high-contrast",
    progress.settings.highContrast,
  );
  save();
  if (gameplayChanged) {
    runtime.configure({ difficulty, celestialMode });
    const messages = getMessages(language);
    liveStatus.textContent = messages.settingsApplied(
      messages.celestial[celestialMode],
      messages.difficulty[difficulty],
    );
  }
  settingsButton.focus();
});

contrastSetting.addEventListener("change", () => {
  document.documentElement.classList.toggle(
    "high-contrast",
    contrastSetting.checked,
  );
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
  language = "de";
  try {
    window.localStorage.removeItem("milosapps.gravity-loop.language");
  } catch {
    // Local storage is optional; resetting the active UI still succeeds.
  }
  soundSetting.checked = progress.settings.sound;
  motionSetting.value = progress.settings.motion;
  contrastSetting.checked = progress.settings.highContrast;
  difficultySetting.value = progress.settings.difficulty;
  celestialModeSetting.value = progress.settings.celestialMode;
  celestialStyleSetting.value = progress.settings.celestialStyle;
  cometSkinSetting.value = progress.settings.cometSkin;
  document.documentElement.classList.remove("high-contrast");
  save();
  applyStaticTranslations();
  const shell = document.querySelector("milos-app-shell") as
    | (HTMLElement & { applyLocale(locale: string, persist?: boolean): void })
    | null;
  shell?.applyLocale("de", false);
  runtime.configure({
    difficulty: progress.settings.difficulty,
    celestialMode: progress.settings.celestialMode,
  });
  resetConfirmation.hidden = true;
  if (resetProgressLabel) {
    resetProgressLabel.textContent =
      getMessages(language).static.resetDone;
  }
  resetProgressButton.disabled = true;
  liveStatus.textContent = getMessages(language).static.resetAnnouncement;
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

document.documentElement.classList.toggle(
  "high-contrast",
  progress.settings.highContrast,
);

const searchParameters = new URLSearchParams(window.location.search);
if (searchParameters.get("test") === "1") {
  window.__gravityLoopTestApi = {
    getDebugState: () => runtime.getDebugState(),
    getLanguage: () => language,
    getShellEnvironment: () => "dev",
    reset: () => runtime.reset(),
    pause: () => runtime.pause("manual"),
    resumeWithHold: () => runtime.beginHold(),
  };
}
