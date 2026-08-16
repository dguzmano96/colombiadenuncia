import {
  firstAttempt,
  isLikelyImage,
  nextAttempt,
  shouldAcceptOriginal,
  WEBP_MIME,
  type EncodeAttempt,
} from "./webp-pipeline";

export type CompressErrorCode = "not_image" | "too_large" | "encode_failed";

export type CompressOk = {
  ok: true;
  blob: Blob;
  skippedEncode: boolean;
};

export type CompressErr = {
  ok: false;
  code: CompressErrorCode;
  message: string;
};

export type CompressResult = CompressOk | CompressErr;

export type EncodeFrameInput = {
  bitmap: ImageBitmap;
  attempt: EncodeAttempt;
};

export type CompressDeps = {
  decode: (blob: Blob) => Promise<ImageBitmap>;
  encodeFrame: (input: EncodeFrameInput) => Promise<Blob>;
};

export const MSG_NOT_IMAGE =
  "El archivo no es una imagen. Elige una foto (JPEG, PNG o WebP).";
export const MSG_TOO_LARGE =
  "No se pudo comprimir la foto por debajo de 180 KB. Puedes continuar sin foto.";
export const MSG_ENCODE_FAILED =
  "No se pudo comprimir la foto. Puedes continuar sin foto.";
export const MSG_WEBP_UNSUPPORTED =
  "El navegador no pudo generar WebP. Puedes continuar sin foto.";

export async function runCompressionPipeline(
  file: File,
  deps: CompressDeps,
): Promise<CompressResult> {
  if (!isLikelyImage(file)) {
    return { ok: false, code: "not_image", message: MSG_NOT_IMAGE };
  }

  if (shouldAcceptOriginal(file)) {
    return { ok: true, blob: file, skippedEncode: true };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await deps.decode(file);
  } catch {
    return { ok: false, code: "not_image", message: MSG_NOT_IMAGE };
  }

  try {
    let attempt = firstAttempt();
    for (;;) {
      let blob: Blob;
      try {
        blob = await deps.encodeFrame({ bitmap, attempt });
      } catch {
        return { ok: false, code: "encode_failed", message: MSG_ENCODE_FAILED };
      }

      if (blob.type !== WEBP_MIME) {
        return { ok: false, code: "encode_failed", message: MSG_WEBP_UNSUPPORTED };
      }

      const decision = nextAttempt(attempt, blob.size, bitmap);
      if (decision.kind === "accept") {
        return { ok: true, blob, skippedEncode: false };
      }
      if (decision.kind === "fail") {
        return { ok: false, code: "too_large", message: MSG_TOO_LARGE };
      }
      attempt = decision.attempt;
    }
  } finally {
    bitmap.close();
  }
}
