import { describe, expect, it, vi } from "vitest";
import { MSG_ENCODE_FAILED, type CompressResult } from "./compress-image";
import { compressPhoto } from "./compress-photo";
import { ENCODE_FALLBACK_KEY } from "./record-encode-fallback";
import { WEBP_MIME } from "./webp-pipeline";

function mockWorker(result: CompressResult): () => Worker {
  return () => {
    const worker = {
      onmessage: null as ((event: MessageEvent<CompressResult>) => void) | null,
      onerror: null as (() => void) | null,
      postMessage() {
        queueMicrotask(() => {
          worker.onmessage?.({ data: result } as MessageEvent<CompressResult>);
        });
      },
      terminate: vi.fn(),
    };
    return worker as unknown as Worker;
  };
}

describe("compressPhoto", () => {
  it("usa Web Worker en el camino feliz cuando hay OffscreenCanvas", async () => {
    const blob = new Blob([new Uint8Array(20)], { type: WEBP_MIME });
    const file = new File(["jpeg"], "shot.jpg", { type: "image/jpeg" });
    const result = await compressPhoto(file, {
      canUseWorker: () => true,
      createWorker: mockWorker({
        ok: true,
        blob,
        skippedEncode: false,
      }),
    });
    expect(result.strategy).toBe("worker");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blob.type).toBe(WEBP_MIME);
    }
  });

  it("degrada a hilo principal y registra fallback si falta la API", async () => {
    const blob = new Blob([new Uint8Array(20)], { type: WEBP_MIME });
    const file = new File(["jpeg"], "shot.jpg", { type: "image/jpeg" });
    sessionStorage.clear();
    const result = await compressPhoto(file, {
      canUseWorker: () => false,
      runMainThread: async () => ({ ok: true, blob, skippedEncode: false }),
    });
    expect(result.strategy).toBe("main-thread");
    expect(result.ok).toBe(true);
    expect(sessionStorage.getItem(ENCODE_FALLBACK_KEY)).toBe(
      "offscreencanvas-or-worker-missing",
    );
  });

  it("propaga fallo del worker sin dual-track silencioso", async () => {
    const file = new File(["jpeg"], "shot.jpg", { type: "image/jpeg" });
    const result = await compressPhoto(file, {
      canUseWorker: () => true,
      createWorker: mockWorker({
        ok: false,
        code: "encode_failed",
        message: MSG_ENCODE_FAILED,
      }),
    });
    expect(result.strategy).toBe("worker");
    expect(result.ok).toBe(false);
  });
});
