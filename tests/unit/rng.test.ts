import { describe, expect, it } from "vitest";
import { localDateKey, nextRandom, seedFromDate } from "../../src/core/rng";

describe("deterministic random source", () => {
  it("repeats an identical sequence for the same seed", () => {
    function sequence(seed: number): number[] {
      const values: number[] = [];
      let state = seed;
      for (let index = 0; index < 8; index += 1) {
        const result = nextRandom(state);
        state = result.state;
        values.push(result.value);
      }
      return values;
    }

    expect(sequence(18_204)).toEqual(sequence(18_204));
    expect(sequence(18_204)).not.toEqual(sequence(18_205));
  });

  it("uses the player's calendar date for a predictable daily orbit", () => {
    const startOfDay = new Date(2026, 6, 30, 0, 0, 1);
    const endOfDay = new Date(2026, 6, 30, 23, 59, 59);
    const nextDay = new Date(2026, 6, 31, 0, 0, 0);

    expect(seedFromDate(startOfDay)).toBe(seedFromDate(endOfDay));
    expect(seedFromDate(nextDay)).not.toBe(seedFromDate(endOfDay));
    expect(localDateKey(endOfDay)).toBe("2026-07-30");
  });
});
