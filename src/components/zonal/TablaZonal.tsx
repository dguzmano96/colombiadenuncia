"use client";

import { useEffect, useState } from "react";
import type { PublicMapZoneSelection } from "@/components/mapa/PublicMap";
import {
  fetchTablaZonal,
  fetchZonaBounds,
  type ConsultaTablaZonal,
  type FilaTablaZonal,
  type MetaTablaZonal,
} from "@/zonal/table-zonal";

type TablaStatus =
  | { kind: "loading" }
  | { kind: "ready"; filas: FilaTablaZonal[]; meta: MetaTablaZonal }
  | { kind: "error"; message: string };

export type TablaZonalProps = {
  onSelectZona?: (selection: PublicMapZoneSelection) => void;
};

export function TablaZonal({ onSelectZona }: TablaZonalProps = {}) {
  const [consulta, setConsulta] = useState<ConsultaTablaZonal>({ page: 1 });
  const [status, setStatus] = useState<TablaStatus>({ kind: "loading" });
  const [opciones, setOpciones] = useState({
    departamentos: [] as string[],
    municipios: [] as string[],
  });
  const [reload, setReload] = useState(0);
  const [selectedFila, setSelectedFila] = useState<{
    departamento: string;
    municipio: string;
  } | null>(null);
  const [zonaError, setZonaError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "loading" });
    void fetchTablaZonal(consulta).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setOpciones({
          departamentos: result.meta.departamentos,
          municipios: result.meta.municipios,
        });
        setStatus({ kind: "ready", filas: result.filas, meta: result.meta });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [consulta, reload]);

  function cambiarDepartamento(departamento: string) {
    setOpciones((current) => ({ ...current, municipios: [] }));
    setConsulta({
      departamento: departamento || undefined,
      municipio: undefined,
      page: 1,
    });
  }

  function cambiarMunicipio(municipio: string) {
    setConsulta((current) => ({
      ...current,
      municipio: municipio || undefined,
      page: 1,
    }));
  }

  function limpiarFiltros() {
    setOpciones((current) => ({ ...current, municipios: [] }));
    setConsulta({ page: 1 });
  }

  function cambiarPagina(page: number) {
    setConsulta((current) => ({ ...current, page }));
  }

  async function seleccionarFila(fila: FilaTablaZonal) {
    setSelectedFila({
      departamento: fila.departamento,
      municipio: fila.municipio,
    });
    setZonaError(null);
    onSelectZona?.({
      kind: "loading",
      departamento: fila.departamento,
      municipio: fila.municipio,
    });

    const result = await fetchZonaBounds(fila.departamento, fila.municipio);
    if (result.ok) {
      onSelectZona?.({
        kind: "ready",
        departamento: fila.departamento,
        municipio: fila.municipio,
        bounds: result.bounds,
      });
    } else {
      const errorMsg =
        result.error || "Geometría no disponible para la zona seleccionada.";
      setZonaError(errorMsg);
      onSelectZona?.({
        kind: "error",
        departamento: fila.departamento,
        municipio: fila.municipio,
        message: errorMsg,
      });
    }
  }

  function isFilaSelected(fila: FilaTablaZonal): boolean {
    return (
      selectedFila !== null &&
      selectedFila.departamento === fila.departamento &&
      selectedFila.municipio === fila.municipio
    );
  }

  const hasFilters = Boolean(consulta.departamento || consulta.municipio);

  return (
    <section aria-label="Exploración de tabla zonal">
      <div className="mb-4 grid gap-3 rounded-md border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-stone-800">
          Departamento
          <select
            aria-label="Departamento"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 font-normal"
            value={consulta.departamento ?? ""}
            onChange={(event) => cambiarDepartamento(event.target.value)}
          >
            <option value="">Todos los departamentos</option>
            {opciones.departamentos.map((departamento) => (
              <option key={departamento} value={departamento}>
                {departamento}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-stone-800">
          Municipio
          <select
            aria-label="Municipio"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 font-normal disabled:bg-stone-100"
            value={consulta.municipio ?? ""}
            onChange={(event) => cambiarMunicipio(event.target.value)}
            disabled={!consulta.departamento}
          >
            <option value="">
              {consulta.departamento
                ? "Todos los municipios"
                : "Selecciona primero un departamento"}
            </option>
            {opciones.municipios.map((municipio) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="w-fit rounded-md border border-stone-400 px-3 py-2 text-sm text-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={limpiarFiltros}
          disabled={!hasFilters}
        >
          Limpiar filtros
        </button>
      </div>

      {status.kind === "loading" && (
        <p role="status" className="rounded-md border border-dashed border-stone-300 p-4">
          Cargando tabla zonal…
        </p>
      )}

      {status.kind === "error" && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4">
          <p>{status.message}</p>
          <button
            type="button"
            className="mt-3 rounded-md bg-red-800 px-3 py-2 text-sm text-white"
            onClick={() => setReload((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      )}

      {status.kind === "ready" && status.filas.length === 0 && (
        <div
          role="status"
          className="rounded-md border border-stone-200 bg-white p-4"
        >
          <p>No hay zonas con información pública para estos filtros.</p>
          <button
            type="button"
            className="mt-3 rounded-md bg-stone-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={limpiarFiltros}
            disabled={!hasFilters}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {status.kind === "ready" && status.filas.length > 0 && (
        <>
          {zonaError && (
            <div
              role="alert"
              className="mb-3 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <p>{zonaError}</p>
              <button
                type="button"
                className="ml-3 text-xs font-semibold underline hover:no-underline"
                onClick={() => setZonaError(null)}
                aria-label="Cerrar aviso de error de zona"
              >
                Cerrar
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">
                Denuncias públicas agregadas por departamento y municipio
              </caption>
              <thead className="bg-stone-100 text-stone-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Departamento
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Municipio
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Cantidad
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {status.filas.map((fila) => (
                  <tr
                    key={`${fila.departamento}-${fila.municipio}`}
                    className={`border-t border-stone-100 transition-colors hover:bg-stone-50 ${
                      isFilaSelected(fila) ? "bg-amber-50 font-medium" : ""
                    }`}
                    aria-selected={isFilaSelected(fila)}
                  >
                    <td className="px-4 py-3">{fila.departamento}</td>
                    <td className="px-4 py-3">{fila.municipio}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fila.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                        aria-label={`Centrar mapa en ${fila.municipio}, ${fila.departamento}`}
                        onClick={() => void seleccionarFila(fila)}
                      >
                        Centrar en mapa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav
            aria-label="Paginación de tabla zonal"
            className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-700"
          >
            <button
              type="button"
              className="rounded-md border border-stone-400 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => cambiarPagina(status.meta.page - 1)}
              disabled={status.meta.page <= 1}
            >
              Anterior
            </button>
            <span>
              Página {status.meta.page} · {status.meta.total} zonas
            </span>
            <button
              type="button"
              className="rounded-md border border-stone-400 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => cambiarPagina(status.meta.page + 1)}
              disabled={!status.meta.hasMore}
            >
              Siguiente
            </button>
            {status.meta.hasMore && (
              <span role="status">Hay más resultados disponibles.</span>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
