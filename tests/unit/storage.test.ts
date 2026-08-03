import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRESS,
  LEGACY_STORAGE_KEY,
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
      version: 3,
      bestScore: 412,
      bestSeries: 7,
      settings: {
        sound: true,
        motion: "system",
        highContrast: false,
        difficulty: "normal",
        celestialMode: "sun",
        celestialStyle: "graphic",
        cometSkin: "mint",
      },
    });
  });

  it("migrates version 2 without losing existing preferences", () => {
    expect(
      decodeProgress(
        JSON.stringify({
          version: 2,
          bestScore: 920,
          bestSeries: 8,
          settings: { sound: true, motion: "reduce", highContrast: true },
        }),
      ),
    ).toEqual({
      version: 3,
      bestScore: 920,
      bestSeries: 8,
      settings: {
        sound: true,
        motion: "reduce",
        highContrast: true,
        difficulty: "normal",
        celestialMode: "sun",
        celestialStyle: "graphic",
        cometSkin: "mint",
      },
    });
  });

  it("sanitizes hostile or out-of-range local values", () => {
    expect(
      decodeProgress(
        JSON.stringify({
          version: 3,
          bestScore: Number.MAX_SAFE_INTEGER,
          bestSeries: -4,
          settings: {
            sound: "yes",
            motion: "spin",
            highContrast: 1,
            difficulty: "impossible",
            celestialMode: "black-hole",
            celestialStyle: "photo-url",
            cometSkin: "<script>",
          },
        }),
      ),
    ).toEqual({
      version: 3,
      bestScore: 999_999_999,
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
    expect(JSON.parse(writtenValue)).toEqual(expect.objectContaining({ version: 3, bestScore: 120 }));
  });

  it("moves the legacy app key into the declared namespaced key without data loss", () => {
    const values = new Map<string, string>([
      [
        LEGACY_STORAGE_KEY,
        JSON.stringify({
          version: 3,
          bestScore: 640,
          bestSeries: 9,
          settings: DEFAULT_PROGRESS.settings,
        }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    expect(loadProgress(storage)).toEqual(
      expect.objectContaining({ bestScore: 640, bestSeries: 9 }),
    );
    expect(values.has(LEGACY_STORAGE_KEY)).toBe(false);
    expect(JSON.parse(values.get(STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({ bestScore: 640, bestSeries: 9 }),
    );
  });
});
