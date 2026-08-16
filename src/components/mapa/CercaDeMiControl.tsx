"use client";

import { useEffect, useState } from "react";
import type { GeoPoint } from "@/domain/geo";
import { requestCurrentPosition } from "@/lib/request-current-position";
import {
  CERCA_DEFAULT_DIST_M,
  type CercaRow,
} from "@/mapa/cerca-params";
import {
  CERCA_EMPTY_MESSAGE,
  CERCA_ERROR_MESSAGE,
  fetchDenunciasCerca,
} from "@/mapa/fetch-denuncias-cerca";

export type CercaDeMiControlProps = {
  origin: GeoPoint | null;
  pinMode: boolean;
  pinConsultNonce?: number;
  onGpsPoint: (point: GeoPoint) => void;
  onAskPin: () => void;
  onAbortPin: () => void;
};

type CercaUi =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "gps_denied"; message: string }
  | { kind: "items"; items: CercaRow[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

async function loadCerca(origin: GeoPoint): Promise<CercaUi> {
  const result = await fetchDenunciasCerca({
    origin,
    dist_m: CERCA_DEFAULT_DIST_M,
  });
  if (!result.ok) {
    return { kind: "error", message: result.error };
  }
  if (result.items.length === 0) {
    return { kind: "empty" };
  }
  return { kind: "items", items: result.items };
}

export function CercaDeMiControl({
  origin,
  pinMode,
  pinConsultNonce = 0,
  onGpsPoint,
  onAskPin,
  onAbortPin,
}: CercaDeMiControlProps) {
  const [ui, setUi] = useState<CercaUi>({ kind: "idle" });

  async function consultarEn(point: GeoPoint) {
    setUi({ kind: "loading" });
    setUi(await loadCerca(point));
  }

  useEffect(() => {
    if (pinConsultNonce === 0 || !origin) return;
    void consultarEn(origin);
  }, [pinConsultNonce, origin]);

  async function onCercaClick() {
    setUi({ kind: "loading" });
    const gps = await requestCurrentPosition();
    if (!gps.ok) {
      setUi({ kind: "gps_denied", message: gps.message });
      return;
    }
    onGpsPoint(gps.point);
    await consultarEn(gps.point);
  }

  async function onConsultarPin() {
    if (!origin) return;
    await consultarEn(origin);
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white"
          onClick={() => {
            void onCercaClick();
          }}
        >
          Cerca de mí
        </button>
        {pinMode ? (
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            onClick={onAbortPin}
          >
            Cancelar pin
          </button>
        ) : null}
        {origin && !pinMode && ui.kind !== "loading" ? (
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            onClick={() => {
              void onConsultarPin();
            }}
          >
            Consultar este origen
          </button>
        ) : null}
      </div>
      {ui.kind === "loading" ? (
        <p role="status" className="text-sm text-stone-600">
          Consultando denuncias cercanas…
        </p>
      ) : null}
      {ui.kind === "gps_denied" ? (
        <div role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm">
          <p>{ui.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-stone-800 px-3 py-1.5 text-sm text-white"
              onClick={onAskPin}
            >
              Colocar pin en el mapa
            </button>
            <button
              type="button"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              onClick={onAbortPin}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {pinMode ? (
        <p role="status" className="text-sm text-stone-600">
          Toca el mapa para fijar el origen de la búsqueda.
        </p>
      ) : null}
      {ui.kind === "empty" ? (
        <p role="status" className="rounded-md bg-stone-100 px-3 py-2 text-sm">
          {CERCA_EMPTY_MESSAGE}
        </p>
      ) : null}
      {ui.kind === "error" ? (
        <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm">
          {ui.message || CERCA_ERROR_MESSAGE}
        </p>
      ) : null}
      {ui.kind === "items" ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {ui.items.map((item) => (
            <li key={item.id}>
              {item.categoria} · {Math.round(item.dist_meters)} m
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
