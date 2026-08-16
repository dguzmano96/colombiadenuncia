export const MAX_WEBP_BYTES = 180 * 1024;
export const MAX_EDGE_PX = 1600;
export const QUALITY_STEPS = [0.8, 0.6, 0.4] as const;
export const MIN_QUALITY = QUALITY_STEPS[QUALITY_STEPS.length - 1];
export const WEBP_MIME = "image/webp";

export type QualityStep = (typeof QUALITY_STEPS)[number];

export type EncodeAttempt = {
  quality: QualityStep;
  maxEdge: number | null;
};

export function isLikelyImage(file: { type: string }): boolean {
  return file.type.startsWith("image/");
}

export function shouldAcceptOriginal(file: { type: string; size: number }): boolean {
  return file.type === WEBP_MIME && file.size <= MAX_WEBP_BYTES;
}

export function firstAttempt(): EncodeAttempt {
  return { quality: QUALITY_STEPS[0], maxEdge: null };
}

export function scaledSize(
  width: number,
  height: number,
  maxEdge: number | null,
): { width: number; height: number } {
  if (maxEdge === null) {
    return { width, height };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function nextAttempt(
  current: EncodeAttempt,
  resultBytes: number,
  bitmap: { width: number; height: number },
): { kind: "accept" } | { kind: "retry"; attempt: EncodeAttempt } | { kind: "fail" } {
  if (resultBytes <= MAX_WEBP_BYTES) {
    return { kind: "accept" };
  }

  const qualityIndex = QUALITY_STEPS.indexOf(current.quality);
  if (qualityIndex >= 0 && qualityIndex < QUALITY_STEPS.length - 1) {
    return {
      kind: "retry",
      attempt: {
        quality: QUALITY_STEPS[qualityIndex + 1],
        maxEdge: current.maxEdge,
      },
    };
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  if (current.maxEdge === null && longest > MAX_EDGE_PX) {
    return {
      kind: "retry",
      attempt: { quality: QUALITY_STEPS[0], maxEdge: MAX_EDGE_PX },
    };
  }

  return { kind: "fail" };
}
