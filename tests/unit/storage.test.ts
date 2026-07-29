import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRESS,
  STORAGE_KEY,
  decodeProgress,
  loadProgress,
  saveProgress,
} from "../../src/storage";

describe("local progress storage", () => {
  it("returns independent defaults for missing or damaged records", () => {
    const first = decodeProgress(null);
    const second = decodeProgress("{damaged");
    first.settings.sound = true;

    expect(second).toEqual(DEFAULT_PROGRESS);
    expect(second.settings.sound).toBe(false);
  });

  it("migrates version 1 and preserves mute intent", () => {
    expect(
      decodeProgress(JSON.stringify({ version: 1, best: 412.9, streak: 7, muted: false })),
    ).toEqual({
      version: 2,
      bestScore: 412,
      bestSeries: 7,
      settings: {
        sound: true,
        motion: "system",
        highContrast: false,
      },
    });
  });

  it("sanitizes hostile or out-of-range local values", () => {
    expect(
      decodeProgress(
        JSON.stringify({
          version: 2,
          bestScore: Number.MAX_SAFE_INTEGER,
          bestSeries: -4,
          settings: { sound: "yes", motion: "spin", highContrast: 1 },
        }),
      ),
    ).toEqual({
      version: 2,
      bestScore: 999_999_999,
      bestSeries: 0,
      settings: {
        sound: false,
        motion: "system",
        highContrast: false,
      },
    });
  });

  it("survives storage access failures without breaking the game", () => {
    const brokenStorage = {
      getItem(): string | null {
        throw new Error("blocked");
      },
      setItem(): void {
        throw new Error("blocked");
      },
    };

    expect(loadProgress(brokenStorage)).toEqual(DEFAULT_PROGRESS);
    expect(saveProgress(brokenStorage, DEFAULT_PROGRESS)).toBe(false);
  });

  it("writes a stable versioned record", () => {
    let writtenKey = "";
    let writtenValue = "";
    const storage = {
      getItem: () => null,
      setItem(key: string, value: string) {
        writtenKey = key;
        writtenValue = value;
      },
    };

    expect(saveProgress(storage, { ...DEFAULT_PROGRESS, bestScore: 120 })).toBe(true);
    expect(writtenKey).toBe(STORAGE_KEY);
    expect(JSON.parse(writtenValue)).toEqual(expect.objectContaining({ version: 2, bestScore: 120 }));
  });
});
