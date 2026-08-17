"use client";

import { useCallback, useState } from "react";
import type { Categoria } from "@/domain/denuncia";
import type { GeoPoint } from "@/domain/geo";
import { TablaZonal } from "@/components/zonal/TablaZonal";
import {
  readCategoriaFilter,
  writeCategoriaFilter,
} from "@/mapa/filter-categoria";
import { CategoriaFilterControl } from "./CategoriaFilterControl";
import { CercaDeMiControl } from "./CercaDeMiControl";
import { PublicMap, type PublicMapZoneSelection } from "./PublicMap";

export function MapaExplorer() {
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [pinConsultNonce, setPinConsultNonce] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>(() =>
    readCategoriaFilter(),
  );
  const [selectedZone, setSelectedZone] = useState<PublicMapZoneSelection>({
    kind: "idle",
  });

  const onMapClick = useCallback((point: GeoPoint) => {
    setOrigin(point);
    setPinMode(false);
    setPinConsultNonce((n) => n + 1);
  }, []);

  const onAskPin = useCallback(() => setPinMode(true), []);
  const onVeedorPoint = useCallback((point: GeoPoint) => {
    setOrigin(point);
    setPinMode(false);
  }, []);

  const onCategoriasChange = useCallback((next: Categoria[]) => {
    setCategorias(next);
    writeCategoriaFilter(next);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <CategoriaFilterControl
        selected={categorias}
        onChange={onCategoriasChange}
      />
      <CercaDeMiControl
        origin={origin}
        pinMode={pinMode}
        pinConsultNonce={pinConsultNonce}
        onGpsPoint={(point) => {
          setOrigin(point);
          setPinMode(false);
        }}
        onAskPin={onAskPin}
        onAbortPin={() => setPinMode(false)}
      />
      <PublicMap
        pinMode={pinMode}
        origin={origin}
        onMapClick={pinMode ? onMapClick : undefined}
        onAskPin={onAskPin}
        onVeedorPoint={onVeedorPoint}
        selectedCategorias={categorias}
        selectedZone={selectedZone}
      />
      <section id="tabla-zonal" className="mt-2">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">
          Tabla pública por zona
        </h2>
        <p className="mb-4 text-sm text-stone-700">
          Conteos de denuncias publicadas por departamento y municipio. No se
          muestran coordenadas ni datos personales.
        </p>
        <TablaZonal onSelectZona={setSelectedZone} />
      </section>
    </div>
  );
}
