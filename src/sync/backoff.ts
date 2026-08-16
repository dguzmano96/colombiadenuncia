export const BACKOFF_MS = [5_000, 30_000, 120_000] as const;
export const MAX_SYNC_ATTEMPTS = 8;
export const PAUSED_PROXIMA_AT = Number.MAX_SAFE_INTEGER;

export function nextProximaAt(
  intentosTrasFallo: number,
  now: number,
): number {
  if (intentosTrasFallo >= MAX_SYNC_ATTEMPTS) {
    return PAUSED_PROXIMA_AT;
  }
  const index = Math.min(intentosTrasFallo - 1, BACKOFF_MS.length - 1);
  return now + BACKOFF_MS[index];
}

export function isManuallyPaused(proximaAt: number): boolean {
  return proximaAt >= PAUSED_PROXIMA_AT;
}
