import { scaledSize, WEBP_MIME, type EncodeAttempt } from "./webp-pipeline";

export async function encodeWithOffscreenCanvas(
  bitmap: ImageBitmap,
  attempt: EncodeAttempt,
): Promise<Blob> {
  const size = scaledSize(bitmap.width, bitmap.height, attempt.maxEdge);
  const canvas = new OffscreenCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("offscreen-2d-unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return canvas.convertToBlob({ type: WEBP_MIME, quality: attempt.quality });
}
