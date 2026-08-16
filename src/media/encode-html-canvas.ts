import { scaledSize, WEBP_MIME, type EncodeAttempt } from "./webp-pipeline";

export function encodeWithHtmlCanvas(
  bitmap: ImageBitmap,
  attempt: EncodeAttempt,
): Promise<Blob> {
  const size = scaledSize(bitmap.width, bitmap.height, attempt.maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("canvas-2d-unavailable"));
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("toBlob-null"));
          return;
        }
        resolve(blob);
      },
      WEBP_MIME,
      attempt.quality,
    );
  });
}
