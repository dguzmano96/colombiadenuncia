import { describe, expect, it } from "vitest";
import {
  MSG_NOT_IMAGE,
  MSG_TOO_LARGE,
  runCompressionPipeline,
} from "./compress-image";
import { MAX_WEBP_BYTES, WEBP_MIME } from "./webp-pipeline";

function fakeBitmap(width: number, height: number): ImageBitmap {
  return {
    width,
    height,
    close() {},
  } as ImageBitmap;
}

function webpBlob(size: number): Blob {
  return new Blob([new Uint8Array(size)], { type: WEBP_MIME });
}

describe("runCompressionPipeline", () => {
  it("rechaza no-imagen sin decodificar", async () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const result = await runCompressionPipeline(file, {
      decode: async () => {
        throw new Error("should-not-decode");
      },
      encodeFrame: async () => {
        throw new Error("should-not-encode");
      },
    });
    expect(result).toEqual({
      ok: false,
      code: "not_image",
      message: MSG_NOT_IMAGE,
    });
  });

  it("acepta WebP original ≤180 KB sin inflar", async () => {
    const file = new File([new Uint8Array(1000)], "ok.webp", { type: WEBP_MIME });
    const result = await runCompressionPipeline(file, {
      decode: async () => {
        throw new Error("should-not-decode");
      },
      encodeFrame: async () => {
        throw new Error("should-not-encode");
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.skippedEncode).toBe(true);
      expect(result.blob.size).toBe(1000);
      expect(result.blob.type).toBe(WEBP_MIME);
    }
  });

  it("devuelve image/webp ≤180 KB tras el pipeline de calidad", async () => {
    const file = new File([new Uint8Array(4 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    const result = await runCompressionPipeline(file, {
      decode: async () => fakeBitmap(2000, 1000),
      encodeFrame: async ({ attempt }) => {
        if (attempt.quality <= 0.6) {
          return webpBlob(50 * 1024);
        }
        return webpBlob(MAX_WEBP_BYTES + 10);
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blob.type).toBe(WEBP_MIME);
      expect(result.blob.size).toBeLessThanOrEqual(MAX_WEBP_BYTES);
      expect(result.skippedEncode).toBe(false);
    }
  });

  it("escala a 1600 y falla con error accionable si sigue grande", async () => {
    const file = new File([new Uint8Array(8 * 1024 * 1024)], "huge.jpg", {
      type: "image/jpeg",
    });
    const edges: Array<number | null> = [];
    const result = await runCompressionPipeline(file, {
      decode: async () => fakeBitmap(4000, 3000),
      encodeFrame: async ({ attempt }) => {
        edges.push(attempt.maxEdge);
        return webpBlob(MAX_WEBP_BYTES + 1);
      },
    });
    expect(result).toEqual({
      ok: false,
      code: "too_large",
      message: MSG_TOO_LARGE,
    });
    expect(edges).toContain(1600);
  });
});
