export const STORAGE_KEY = "gravity-loop:progress";
export const STORAGE_VERSION = 2;

export type MotionPreference = "system" | "reduce" | "full";

export interface PlayerSettings {
  sound: boolean;
  motion: MotionPreference;
  highContrast: boolean;
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
  },
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

function sanitizeV2(value: Record<string, unknown>): ProgressRecord {
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
    },
  };
}

function migrateV1(value: Record<string, unknown>): ProgressRecord {
  return {
    version: STORAGE_VERSION,
    bestScore: safeInteger(value.best),
    bestSeries: safeInteger(value.streak, 99_999),
    settings: {
      sound: value.muted === false,
      motion: "system",
      highContrast: false,
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
      return sanitizeV2(record);
    }
    if (record.version === 1) {
      return migrateV1(record);
    }
  } catch {
    // A damaged local record is intentionally replaced with safe defaults.
  }

  return structuredClone(DEFAULT_PROGRESS);
}

export function loadProgress(storage: StorageLike): ProgressRecord {
  try {
    return decodeProgress(storage.getItem(STORAGE_KEY));
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(storage: StorageLike, progress: ProgressRecord): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeV2(progress as unknown as Record<string, unknown>)));
    return true;
  } catch {
    return false;
  }
}
