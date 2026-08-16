"use client";

import { useId, useState } from "react";
import { compressPhoto } from "@/media/compress-photo";

export type FotoFieldValue = Blob | null;

type FotoFieldProps = {
  value: FotoFieldValue;
  onChange: (blob: FotoFieldValue) => void;
  compress?: typeof compressPhoto;
};

const COPY_PRIVACY =
  "Evita rostros y documentos en la foto si es posible. No bloquea el envío.";

export function FotoField({
  value,
  onChange,
  compress = compressPhoto,
}: FotoFieldProps) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    setError(null);
    setInfo(null);
    if (!file) {
      onChange(null);
      return;
    }

    setBusy(true);
    const result = await compress(file);
    setBusy(false);

    if (!result.ok) {
      onChange(null);
      setError(result.message);
      return;
    }

    onChange(result.blob);
    const kb = Math.ceil(result.blob.size / 1024);
    setInfo(
      result.skippedEncode
        ? `Foto WebP aceptada (${kb} KB).`
        : `Foto comprimida a WebP (${kb} KB).`,
    );
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-stone-200 p-3">
      <legend className="px-1 text-sm font-medium">Foto (opcional)</legend>
      <p className="text-xs text-stone-600">{COPY_PRIVACY}</p>
      <label className="flex flex-col gap-1 text-sm" htmlFor={inputId}>
        Adjuntar imagen
        <input
          id={inputId}
          name="foto"
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            void handleFile(file);
          }}
          className="text-sm"
        />
      </label>
      {busy ? (
        <p className="text-sm text-stone-700" data-testid="foto-busy">
          Comprimiendo foto…
        </p>
      ) : null}
      {info ? <p className="text-sm text-green-800">{info}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {value ? (
        <button
          type="button"
          className="self-start text-sm underline"
          onClick={() => {
            onChange(null);
            setInfo(null);
            setError(null);
          }}
        >
          Quitar foto
        </button>
      ) : null}
    </fieldset>
  );
}
