"use client";

import dynamic from "next/dynamic";

export const PublicMapIsland = dynamic(
  () =>
    import("@/components/mapa/MapaExplorer").then((mod) => mod.MapaExplorer),
  {
    ssr: false,
    loading: () => (
      <p className="rounded-md border border-dashed border-stone-300 p-4 text-sm">
        Cargando mapa de denuncias públicas…
      </p>
    ),
  },
);
