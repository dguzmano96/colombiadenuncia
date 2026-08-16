"use client";

import { useEffect, useRef, useState } from "react";
import {
  ATESTIGUAR_RADIO_M,
  distanceMeters,
  isWithinAtestiguarRadio,
  type GeoPoint,
} from "@/domain/geo";
import { requestCurrentPosition } from "@/lib/request-current-position";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/sync/TurnstileWidget";
import { getLocalDeviceId } from "@/veeduria/device-id";
import { postAtestiguo } from "@/veeduria/fetch-atestiguar";
import type { AtestiguarCounts } from "@/veeduria/atestiguar-params";

export const GPS_DENIED_ATESTIGUAR =
  "Activa la ubicación o usa un pin de veedor en el mapa.";

type Props = {
  denunciaId: string;
  geopunto: GeoPoint;
  veedorOrigin?: GeoPoint | null;
  onAskPin?: () => void;
  onVeedorPoint?: (point: GeoPoint) => void;
  onSuccess?: (counts: AtestiguarCounts) => void;
  siteKey?: string;
  requestPosition?: typeof requestCurrentPosition;
  post?: typeof postAtestiguo;
};

type Ui =
  | { kind: "locating" }
  | { kind: "gps_denied"; message: string }
  | { kind: "ready"; meters: number }
  | { kind: "submitting" }
  | { kind: "done"; counts: AtestiguarCounts }
  | { kind: "error"; message: string };

export function AtestiguarControl({
  denunciaId,
  geopunto,
  veedorOrigin = null,
  onAskPin,
  onVeedorPoint,
  onSuccess,
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  requestPosition = requestCurrentPosition,
  post = postAtestiguo,
}: Props) {
  const handleRef = useRef<TurnstileHandle | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ui, setUi] = useState<Ui>(() =>
    veedorOrigin
      ? { kind: "ready", meters: distanceMeters(veedorOrigin, geopunto) }
      : { kind: "locating" },
  );
  const originRef = useRef<GeoPoint | null>(veedorOrigin);

  useEffect(() => {
    if (veedorOrigin) {
      originRef.current = veedorOrigin;
      setErrorMessage(null);
      setUi({ kind: "ready", meters: distanceMeters(veedorOrigin, geopunto) });
      return;
    }
    let cancelled = false;
    void (async () => {
      setUi({ kind: "locating" });
      const gps = await requestPosition();
      if (cancelled) return;
      if (!gps.ok) {
        setUi({
          kind: "gps_denied",
          message: `${gps.message} ${GPS_DENIED_ATESTIGUAR}`,
        });
        return;
      }
      originRef.current = gps.point;
      onVeedorPoint?.(gps.point);
      setUi({ kind: "ready", meters: distanceMeters(gps.point, geopunto) });
    })();
    return () => {
      cancelled = true;
    };
  }, [veedorOrigin, geopunto, onVeedorPoint, requestPosition]);

  const within =
    ui.kind === "ready" && isWithinAtestiguarRadio(ui.meters);
  const disabled = ui.kind !== "ready" || !within;

  async function onAtestiguar() {
    const origin = originRef.current;
    if (!origin || !within) return;
    setErrorMessage(null);
    setUi({ kind: "submitting" });
    const token = (await handleRef.current?.getToken()) ?? "";
    if (!token) {
      setUi({ kind: "ready", meters: distanceMeters(origin, geopunto) });
      setErrorMessage("Completa el reto de seguridad para atestiguar.");
      return;
    }
    const result = await post({
      turnstileToken: token,
      denunciaId,
      deviceId: getLocalDeviceId(),
      lat: origin.lat,
      lon: origin.lon,
    });
    handleRef.current?.reset();
    if (!result.ok) {
      setUi({ kind: "ready", meters: distanceMeters(origin, geopunto) });
      setErrorMessage(result.message ?? "No se pudo registrar el atestiguo.");
      return;
    }
    setUi({ kind: "done", counts: result.counts });
    onSuccess?.(result.counts);
  }

  return (
    <section className="mt-3 border-t border-stone-200 pt-3" aria-label="Atestiguar">
      {ui.kind === "locating" ? (
        <p role="status">Obteniendo ubicación del veedor…</p>
      ) : null}
      {ui.kind === "gps_denied" ? (
        <div role="status" className="rounded-md bg-amber-50 px-3 py-2">
          <p>{ui.message}</p>
          {onAskPin ? (
            <button
              type="button"
              className="mt-2 rounded-md bg-stone-800 px-3 py-1.5 text-sm text-white"
              onClick={onAskPin}
            >
              Usar pin de veedor
            </button>
          ) : null}
        </div>
      ) : null}
      {ui.kind === "ready" && !within ? (
        <p role="status" className="text-stone-600">
          Aprox. {Math.round(ui.meters)} m del geopunto (radio {ATESTIGUAR_RADIO_M}{" "}
          m).
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-red-800">
          {errorMessage}
        </p>
      ) : null}
      {ui.kind === "error" ? (
        <p role="alert" className="text-red-800">
          {ui.message}
        </p>
      ) : null}
      {ui.kind === "done" ? (
        <p role="status">
          Atestiguo registrado. Trust Score {ui.counts.trust_score}.
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2">
        <TurnstileWidget siteKey={siteKey} handleRef={handleRef} />
        <button
          type="button"
          className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            void onAtestiguar();
          }}
        >
          Atestiguar
        </button>
      </div>
    </section>
  );
}
