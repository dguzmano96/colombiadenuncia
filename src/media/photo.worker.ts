import { runCompressionPipeline, type CompressResult } from "./compress-image";
import { encodeWithOffscreenCanvas } from "./encode-offscreen";

export type PhotoWorkerRequest = {
  file: File;
};

self.onmessage = async (event: MessageEvent<PhotoWorkerRequest>) => {
  const file = event.data.file;
  const result: CompressResult = await runCompressionPipeline(file, {
    decode: (blob) => createImageBitmap(blob),
    encodeFrame: ({ bitmap, attempt }) => encodeWithOffscreenCanvas(bitmap, attempt),
  });
  self.postMessage(result);
};
