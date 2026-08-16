"use client";

import dynamic from "next/dynamic";
import { FormEvent, useMemo, useState } from "react";
import {
  CATEGORIAS,
  DESCARGO_LEGAL,
  type Categoria,
  type ValidationIssue,
} from "@/domain/denuncia";
import type { GeoPoint } from "@/domain/geo";
import { FotoField } from "@/components/captura/FotoField";
import { requestCurrentPosition } from "@/lib/request-current-position";
import { saveDenuncia, isPersistError } from "@/storage/local-denuncia-store";

const PinMap = dynamic(
  () => import("@/components/captura/PinMap").then((mod) => mod.PinMap),
  {
    ssr: false,
    loading: () => (
      <p className="rounded-md border border-dashed border-stone-300 p-4 text-sm">
        Cargando mapa para pin manual…
      </p>
    ),
  },
);

function messageFor(
  issues: ValidationIssue[],
  field: ValidationIssue["field"],
): string | undefined {
  return issues.find((issue) => issue.field === field)?.message;
}

export function DenunciaForm() {
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [relato, setRelato] = useState("");
  const [descargoAceptado, setDescargoAceptado] = useState(false);
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedEstado, setSavedEstado] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [foto, setFoto] = useState<Blob | null>(null);

  const geoLabel = useMemo(() => {
    if (!geo) return "Sin ubicación aún.";
    return `Lat ${geo.lat.toFixed(5)}, Lon ${geo.lon.toFixed(5)} (WGS84)`;
  }, [geo]);

  async function handleGps() {
    setGpsBusy(true);
    setGpsError(null);
    const result = await requestCurrentPosition();
    setGpsBusy(false);
    if (result.ok) {
      setGeo(result.point);
      return;
    }
    setGpsError(result.message);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedId(null);
    setSavedEstado(null);
    setPersistError(null);
    const result = await saveDenuncia({
      categoria,
      relato,
      geo,
      descargoAceptado,
      foto,
    });
    if (!result.ok) {
      if (isPersistError(result)) {
        setPersistError(result.message);
        return;
      }
      setIssues(result.issues);
      return;
    }
    setIssues([]);
    setSavedId(result.denuncia.id);
    setSavedEstado(result.denuncia.estado);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md min-w-[320px] flex-col gap-4 p-4"
      noValidate
    >
      <h1 className="text-xl font-semibold">Registrar denuncia anónima</h1>
      <p className="text-sm text-stone-700">
        No pedimos nombre, documento, teléfono ni correo.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Categoría
        <select
          name="categoria"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value as Categoria | "")}
          className="rounded-md border border-stone-300 bg-white p-2"
          required
        >
          <option value="">Selecciona…</option>
          {CATEGORIAS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {messageFor(issues, "categoria") ? (
          <span role="alert" className="text-red-700">
            {messageFor(issues, "categoria")}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Relato (20 a 1000 caracteres)
        <textarea
          name="relato"
          value={relato}
          onChange={(event) => setRelato(event.target.value)}
          minLength={20}
          maxLength={1000}
          rows={6}
          className="rounded-md border border-stone-300 p-2"
          required
        />
        <span className="text-xs text-stone-600">{relato.trim().length}/1000</span>
        {messageFor(issues, "relato") ? (
          <span role="alert" className="text-red-700">
            {messageFor(issues, "relato")}
          </span>
        ) : null}
      </label>

      <fieldset className="flex flex-col gap-2 rounded-md border border-stone-200 p-3">
        <legend className="px-1 text-sm font-medium">Ubicación</legend>
        <button
          type="button"
          onClick={handleGps}
          disabled={gpsBusy}
          className="rounded-md bg-stone-800 px-3 py-2 text-sm text-white"
        >
          {gpsBusy ? "Obteniendo GPS…" : "Usar GPS"}
        </button>
        {gpsError ? (
          <p role="alert" className="text-sm text-red-700">
            {gpsError}
          </p>
        ) : null}
        <p className="text-sm" data-testid="geo-label">
          {geoLabel}
        </p>
        <PinMap point={geo} onPin={setGeo} />
        {messageFor(issues, "geo") ? (
          <span role="alert" className="text-red-700">
            {messageFor(issues, "geo")}
          </span>
        ) : null}
      </fieldset>

      <FotoField value={foto} onChange={setFoto} />

      <div className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 text-sm">
        <p>{DESCARGO_LEGAL}</p>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="descargo"
            checked={descargoAceptado}
            onChange={(event) => setDescargoAceptado(event.target.checked)}
          />
          <span>He leído y confirmo el descargo legal.</span>
        </label>
        {messageFor(issues, "descargo") ? (
          <span role="alert" className="text-red-700">
            {messageFor(issues, "descargo")}
          </span>
        ) : null}
      </div>

      <button
        type="submit"
        className="rounded-md bg-amber-600 px-4 py-3 text-sm font-semibold text-white"
      >
        Guardar
      </button>

      {persistError ? (
        <p role="alert" className="text-sm text-red-700">
          {persistError}
        </p>
      ) : null}

      {savedId && savedEstado ? (
        <p role="status" className="text-sm text-green-800">
          Denuncia {savedId} guardada en este dispositivo. Estado pendiente de
          sincronizar ({savedEstado}
          {typeof navigator !== "undefined" && navigator.onLine === false
            ? "; sin conexión"
            : ""}
          ). Se enviará cuando haya red.
        </p>
      ) : null}
    </form>
  );
}
