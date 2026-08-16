"use client";

import { useCallback, useState } from "react";
import type { Categoria } from "@/domain/denuncia";
import type { GeoPoint } from "@/domain/geo";
import {
  readCategoriaFilter,
  writeCategoriaFilter,
} from "@/mapa/filter-categoria";
import { CategoriaFilterControl } from "./CategoriaFilterControl";
import { CercaDeMiControl } from "./CercaDeMiControl";
import { PublicMap } from "./PublicMap";

export function MapaExplorer() {
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [pinConsultNonce, setPinConsultNonce] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>(() =>
    readCategoriaFilter(),
  );

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
      />
    </div>
  );
}
