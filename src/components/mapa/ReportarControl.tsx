"use client";

import { useRef, useState } from "react";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/sync/TurnstileWidget";
import { getLocalDeviceId } from "@/veeduria/device-id";
import { postReporte } from "@/veeduria/fetch-reportar";
import {
  REPORTAR_TIPOS,
  type ReportarCounts,
  type ReportarTipo,
} from "@/veeduria/reportar-params";

const TIPO_LABEL: Record<ReportarTipo, string> = {
  spam: "Spam",
  difamacion: "Difamación",
  contenido_falso: "Contenido falso",
};

type Props = {
  denunciaId: string;
  onSuccess?: (counts: ReportarCounts) => void;
  siteKey?: string;
  post?: typeof postReporte;
};

type Ui =
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "done"; counts: ReportarCounts };

export function ReportarControl({
  denunciaId,
  onSuccess,
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  post = postReporte,
}: Props) {
  const handleRef = useRef<TurnstileHandle | null>(null);
  const [tipo, setTipo] = useState<ReportarTipo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ui, setUi] = useState<Ui>({ kind: "ready" });

  const disabled = ui.kind !== "ready" || tipo === null;

  async function onReportar() {
    if (!tipo) return;
    setErrorMessage(null);
    setUi({ kind: "submitting" });
    const token = (await handleRef.current?.getToken()) ?? "";
    if (!token) {
      setUi({ kind: "ready" });
      setErrorMessage("Completa el reto de seguridad para reportar.");
      return;
    }
    const result = await post({
      turnstileToken: token,
      denunciaId,
      deviceId: getLocalDeviceId(),
      tipo,
    });
    handleRef.current?.reset();
    if (!result.ok) {
      setUi({ kind: "ready" });
      setErrorMessage(
        result.message ??
          "No se pudo registrar el reporte. Reintenta el reto de seguridad.",
      );
      return;
    }
    setUi({ kind: "done", counts: result.counts });
    onSuccess?.(result.counts);
  }

  return (
    <section className="mt-3 border-t border-stone-200 pt-3" aria-label="Reportar">
      <fieldset className="grid gap-1">
        <legend className="font-medium text-stone-700">Reportar denuncia</legend>
        {REPORTAR_TIPOS.map((value) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo-reporte"
              value={value}
              checked={tipo === value}
              disabled={ui.kind === "done" || ui.kind === "submitting"}
              onChange={() => {
                setTipo(value);
                setErrorMessage(null);
              }}
            />
            {TIPO_LABEL[value]}
          </label>
        ))}
      </fieldset>
      {errorMessage ? (
        <p role="alert" className="mt-2 text-red-800">
          {errorMessage}
        </p>
      ) : null}
      {ui.kind === "done" ? (
        <p role="status" className="mt-2">
          Reporte registrado. Trust Score {ui.counts.trust_score}.
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2">
        <TurnstileWidget siteKey={siteKey} handleRef={handleRef} />
        <button
          type="button"
          className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            void onReportar();
          }}
        >
          Reportar
        </button>
      </div>
    </section>
  );
}
