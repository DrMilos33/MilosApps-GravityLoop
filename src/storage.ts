import type { CelestialMode, Difficulty } from "./core/game";

export const STORAGE_KEY = "milosapps.gravity-loop.progress";
export const LEGACY_STORAGE_KEY = "gravity-loop:progress";
export const STORAGE_VERSION = 3;

export type MotionPreference = "system" | "reduce" | "full";
export type CelestialStyle = "graphic" | "natural";
export type CometSkin = "mint" | "ember" | "ice" | "hat";

export interface PlayerSettings {
  sound: boolean;
  motion: MotionPreference;
  highContrast: boolean;
  difficulty: Difficulty;
  celestialMode: CelestialMode;
  celestialStyle: CelestialStyle;
  cometSkin: CometSkin;
}

export interface ProgressRecord {
  version: typeof STORAGE_VERSION;
  bestScore: number;
  bestSeries: number;
  settings: PlayerSettings;
}

export const DEFAULT_PROGRESS: ProgressRecord = {
  version: STORAGE_VERSION,
  bestScore: 0,
  bestSeries: 0,
  settings: {
    sound: false,
    motion: "system",
    highContrast: false,
    difficulty: "normal",
    celestialMode: "sun",
    celestialStyle: "graphic",
    cometSkin: "mint",
  },
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function safeInteger(value: unknown, maximum = 999_999_999): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(maximum, Math.max(0, Math.floor(value)));
}

function safeMotion(value: unknown): MotionPreference {
  return value === "reduce" || value === "full" ? value : "system";
}

function safeDifficulty(value: unknown): Difficulty {
  return value === "easy" || value === "hard" ? value : "normal";
}

function safeCelestialMode(value: unknown): CelestialMode {
  return value === "moon" ? value : "sun";
}

function safeCelestialStyle(value: unknown): CelestialStyle {
  return value === "natural" ? value : "graphic";
}

function safeCometSkin(value: unknown): CometSkin {
  return value === "ember" || value === "ice" || value === "hat" ? value : "mint";
}

function sanitizeCurrent(value: Record<string, unknown>): ProgressRecord {
  const settings =
    typeof value.settings === "object" && value.settings !== null
      ? (value.settings as Record<string, unknown>)
      : {};

  return {
    version: STORAGE_VERSION,
    bestScore: safeInteger(value.bestScore),
    bestSeries: safeInteger(value.bestSeries, 99_999),
    settings: {
      sound: settings.sound === true,
      motion: safeMotion(settings.motion),
      highContrast: settings.highContrast === true,
      difficulty: safeDifficulty(settings.difficulty),
      celestialMode: safeCelestialMode(settings.celestialMode),
      celestialStyle: safeCelestialStyle(settings.celestialStyle),
      cometSkin: safeCometSkin(settings.cometSkin),
    },
  };
}

function migrateLegacy(
  value: Record<string, unknown>,
  scoreKey: "best" | "bestScore",
  seriesKey: "streak" | "bestSeries",
): ProgressRecord {
  const settings =
    typeof value.settings === "object" && value.settings !== null
      ? (value.settings as Record<string, unknown>)
      : {};
  return {
    version: STORAGE_VERSION,
    bestScore: safeInteger(value[scoreKey]),
    bestSeries: safeInteger(value[seriesKey], 99_999),
    settings: {
      sound: scoreKey === "best" ? value.muted === false : settings.sound === true,
      motion: scoreKey === "best" ? "system" : safeMotion(settings.motion),
      highContrast: scoreKey === "best" ? false : settings.highContrast === true,
      difficulty: "normal",
      celestialMode: "sun",
      celestialStyle: "graphic",
      cometSkin: "mint",
    },
  };
}

export function decodeProgress(serialized: string | null): ProgressRecord {
  if (!serialized) {
    return structuredClone(DEFAULT_PROGRESS);
  }

  try {
    const value = JSON.parse(serialized) as unknown;
    if (typeof value !== "object" || value === null) {
      return structuredClone(DEFAULT_PROGRESS);
    }

    const record = value as Record<string, unknown>;
    if (record.version === STORAGE_VERSION) {
      return sanitizeCurrent(record);
    }
    if (record.version === 2) {
      return migrateLegacy(record, "bestScore", "bestSeries");
    }
    if (record.version === 1) {
      return migrateLegacy(record, "best", "streak");
    }
  } catch {
    // A damaged local record is intentionally replaced with safe defaults.
  }

  return structuredClone(DEFAULT_PROGRESS);
}

export function loadProgress(storage: StorageLike): ProgressRecord {
  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current !== null) {
      return decodeProgress(current);
    }

    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    const progress = decodeProgress(legacy);
    if (legacy !== null && saveProgress(storage, progress)) {
      storage.removeItem?.(LEGACY_STORAGE_KEY);
    }
    return progress;
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(storage: StorageLike, progress: ProgressRecord): boolean {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(sanitizeCurrent(progress as unknown as Record<string, unknown>)),
    );
    return true;
  } catch {
    return false;
  }
}
