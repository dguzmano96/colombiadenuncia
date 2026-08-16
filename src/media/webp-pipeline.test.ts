import { describe, expect, it } from "vitest";
import {
  firstAttempt,
  MAX_EDGE_PX,
  MAX_WEBP_BYTES,
  nextAttempt,
  QUALITY_STEPS,
  shouldAcceptOriginal,
  scaledSize,
  isLikelyImage,
} from "./webp-pipeline";

describe("webp-pipeline", () => {
  it("acepta WebP original que ya cabe en 180 KB", () => {
    expect(
      shouldAcceptOriginal({ type: "image/webp", size: MAX_WEBP_BYTES }),
    ).toBe(true);
    expect(
      shouldAcceptOriginal({ type: "image/webp", size: MAX_WEBP_BYTES + 1 }),
    ).toBe(false);
    expect(shouldAcceptOriginal({ type: "image/jpeg", size: 1024 })).toBe(false);
  });

  it("rechaza archivos que no son imagen", () => {
    expect(isLikelyImage({ type: "application/pdf" })).toBe(false);
    expect(isLikelyImage({ type: "image/jpeg" })).toBe(true);
  });

  it("baja calidad hasta 0.4 y luego escala a 1600 px", () => {
    const bitmap = { width: 4000, height: 3000 };
    const over = MAX_WEBP_BYTES + 1;

    const q2 = nextAttempt(firstAttempt(), over, bitmap);
    expect(q2).toEqual({
      kind: "retry",
      attempt: { quality: QUALITY_STEPS[1], maxEdge: null },
    });

    const q3 = nextAttempt(q2.kind === "retry" ? q2.attempt : firstAttempt(), over, bitmap);
    expect(q3).toEqual({
      kind: "retry",
      attempt: { quality: QUALITY_STEPS[2], maxEdge: null },
    });

    const scale = nextAttempt(
      q3.kind === "retry" ? q3.attempt : firstAttempt(),
      over,
      bitmap,
    );
    expect(scale).toEqual({
      kind: "retry",
      attempt: { quality: QUALITY_STEPS[0], maxEdge: MAX_EDGE_PX },
    });
  });

  it("falla si tras escala y calidad mínima sigue grande", () => {
    const over = MAX_WEBP_BYTES + 1;
    const decision = nextAttempt(
      { quality: 0.4, maxEdge: MAX_EDGE_PX },
      over,
      { width: 1600, height: 1200 },
    );
    expect(decision.kind).toBe("fail");
  });

  it("acepta cuando el blob ya está en presupuesto", () => {
    expect(nextAttempt(firstAttempt(), MAX_WEBP_BYTES, { width: 10, height: 10 })).toEqual({
      kind: "accept",
    });
  });

  it("no escala si el lado mayor ya es ≤1600", () => {
    const decision = nextAttempt(
      { quality: 0.4, maxEdge: null },
      MAX_WEBP_BYTES + 1,
      { width: 800, height: 600 },
    );
    expect(decision.kind).toBe("fail");
  });

  it("calcula lado mayor ≤1600", () => {
    expect(scaledSize(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 });
  });
});
