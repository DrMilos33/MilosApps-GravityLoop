import { describe, expect, it } from "vitest";
import { createGameState } from "../../src/core/game";
import {
  formatDate,
  formatNumber,
  getMessages,
  staticTranslationKeys,
} from "../../src/i18n";

describe("Gravity Loop localization", () => {
  it("keeps the complete German and English dictionaries in lockstep", () => {
    expect(staticTranslationKeys("en")).toEqual(staticTranslationKeys("de"));
    expect(staticTranslationKeys("de").length).toBeGreaterThan(65);
  });

  it("translates dynamic game state and accessible canvas instructions", () => {
    const moon = createGameState(31, {
      difficulty: "hard",
      celestialMode: "moon",
    });

    expect(getMessages("de").canvasLabel(moon)).toContain("Mondmodus");
    expect(getMessages("en").canvasLabel(moon)).toContain("Moon mode");
    expect(getMessages("de").gameOverKicker("1.200", "4")).toBe(
      "1.200 Punkte · 4 Funken",
    );
    expect(getMessages("en").gameOverKicker("1,200", "4")).toBe(
      "1,200 points · 4 sparks",
    );
  });

  it("formats dates and scores for the active locale", () => {
    const date = new Date(2026, 6, 30);
    expect(formatDate(date, "de")).toContain("Juli");
    expect(formatDate(date, "en")).toContain("July");
    expect(formatNumber(12_345, "de")).toBe("12.345");
    expect(formatNumber(12_345, "en")).toBe("12,345");
  });
});
