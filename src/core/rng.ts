export interface RandomResult {
  state: number;
  value: number;
}

export function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function nextRandom(state: number): RandomResult {
  let nextState = normalizeSeed(state);
  nextState ^= nextState << 13;
  nextState ^= nextState >>> 17;
  nextState ^= nextState << 5;
  nextState >>>= 0;

  return {
    state: normalizeSeed(nextState),
    value: (nextState >>> 0) / 4_294_967_296,
  };
}

export function seedFromDate(date: Date): number {
  const dateKey = [
    date.getFullYear().toString().padStart(4, "0"),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0"),
  ].join("-");

  let hash = 2_166_136_261;
  for (const character of `gravity-loop:${dateKey}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return normalizeSeed(hash);
}

export function localDateKey(date: Date): string {
  return [
    date.getFullYear().toString().padStart(4, "0"),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0"),
  ].join("-");
}
