import {
  MSG_ENCODE_FAILED,
  runCompressionPipeline,
  type CompressResult,
} from "./compress-image";
import { encodeWithHtmlCanvas } from "./encode-html-canvas";
import { recordEncodeFallback } from "./record-encode-fallback";

export type EncodeStrategy = "worker" | "main-thread";

export type CompressPhotoResult = CompressResult & {
  strategy: EncodeStrategy;
};

export type CompressPhotoOptions = {
  createWorker?: () => Worker;
  canUseWorker?: () => boolean;
  runMainThread?: (file: File) => Promise<CompressResult>;
};

export function canUseWorkerOffscreen(
  globalObj: typeof globalThis = globalThis,
): boolean {
  const candidate = globalObj as typeof globalThis & {
    Worker?: typeof Worker;
    OffscreenCanvas?: typeof OffscreenCanvas;
  };
  return (
    typeof candidate.Worker === "function" &&
    typeof candidate.OffscreenCanvas === "function" &&
    typeof candidate.OffscreenCanvas.prototype.convertToBlob === "function"
  );
}

export function createPhotoWorker(): Worker {
  return new Worker(new URL("./photo.worker.ts", import.meta.url));
}

function runOnMainThread(file: File): Promise<CompressResult> {
  return runCompressionPipeline(file, {
    decode: (blob) => createImageBitmap(blob),
    encodeFrame: ({ bitmap, attempt }) => encodeWithHtmlCanvas(bitmap, attempt),
  });
}

function compressInWorker(
  file: File,
  createWorker: () => Worker,
): Promise<CompressResult> {
  return new Promise((resolve) => {
    let settled = false;
    const worker = createWorker();

    const finish = (result: CompressResult) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(result);
    };

    worker.onmessage = (event: MessageEvent<CompressResult>) => {
      finish(event.data);
    };
    worker.onerror = () => {
      finish({ ok: false, code: "encode_failed", message: MSG_ENCODE_FAILED });
    };
    worker.postMessage({ file });
  });
}

export async function compressPhoto(
  file: File,
  options: CompressPhotoOptions = {},
): Promise<CompressPhotoResult> {
  const useWorker = (options.canUseWorker ?? canUseWorkerOffscreen)();

  if (useWorker) {
    const result = await compressInWorker(
      file,
      options.createWorker ?? createPhotoWorker,
    );
    return { ...result, strategy: "worker" };
  }

  recordEncodeFallback("offscreencanvas-or-worker-missing");
  const result = await (options.runMainThread ?? runOnMainThread)(file);
  return { ...result, strategy: "main-thread" };
}
