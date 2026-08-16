import { describe, expect, it } from "vitest";
import {
  BACKOFF_MS,
  MAX_SYNC_ATTEMPTS,
  nextProximaAt,
  PAUSED_PROXIMA_AT,
} from "./backoff";

describe("nextProximaAt", () => {
  it("usa 5s, 30s y 2min y pausa al llegar a 8 intentos", () => {
    const now = 1_000_000;
    expect(nextProximaAt(1, now) - now).toBe(BACKOFF_MS[0]);
    expect(nextProximaAt(2, now) - now).toBe(BACKOFF_MS[1]);
    expect(nextProximaAt(3, now) - now).toBe(BACKOFF_MS[2]);
    expect(nextProximaAt(7, now) - now).toBe(BACKOFF_MS[2]);
    expect(nextProximaAt(MAX_SYNC_ATTEMPTS, now)).toBe(PAUSED_PROXIMA_AT);
  });
});
