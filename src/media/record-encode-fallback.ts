export const ENCODE_FALLBACK_KEY = "colombiadenuncia.encode.fallback";

export function recordEncodeFallback(
  reason: string,
  storage: Pick<Storage, "setItem"> | null = typeof sessionStorage === "undefined"
    ? null
    : sessionStorage,
): void {
  if (!storage) return;
  try {
    storage.setItem(ENCODE_FALLBACK_KEY, reason);
  } catch {
    // Telemetría local opcional (BDD edge); no bloquea el encode.
  }
}
