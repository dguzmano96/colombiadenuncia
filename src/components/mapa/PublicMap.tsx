"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  COLOMBIA_NORTH_EAST,
  COLOMBIA_SOUTH_WEST,
  MAP_VIEW_STORAGE_KEY,
  parseSavedMapView,
} from "@/mapa/colombia-bounds";
import { readMapDetalleId, writeMapDetalleId } from "@/mapa/detalle-deep-link";
import { fetchPublicDetalle } from "@/mapa/fetch-public-detalle";
import {
  CACHE_BANNER,
  fetchPublicGeojson,
} from "@/mapa/fetch-public-geojson";
import type { PublicFeatureCollection } from "@/mapa/public-geojson";
import { YA_NO_ESTA_PUBLICO } from "@/mapa/public-detalle";
import {
  canExpandCluster,
  clusterExpansionZoom,
  clusterLeavesPage,
  clustersForView,
  createPublicClusterIndex,
  isClusterProperties,
  type LngLatBBox,
  type PublicClusterIndex,
} from "@/mapa/supercluster-index";
import { toGeoPoint, type GeoPoint } from "@/domain/geo";
import type { Categoria } from "@/domain/denuncia";
import {
  FILTRO_VACIO_MESSAGE,
  filterFeaturesByCategoria,
} from "@/mapa/filter-categoria";
import { ClusterLeavesPanel } from "./ClusterLeavesPanel";
import {
  DenunciaDetailPanel,
  type DetallePanelState,
} from "./DenunciaDetailPanel";

const OSM_ATTRIBUTION = "&copy; OpenStreetMap contributors";

type MapStatus =
  | { kind: "loading" }
  | { kind: "ready"; collection: PublicFeatureCollection; fromCache: boolean }
  | { kind: "error" };

type LeavesState = {
  clusterId: number;
  ids: string[];
  hasMore: boolean;
  offset: number;
  canZoom: boolean;
};

export type PublicMapZoneSelection =
  | { kind: "idle" }
  | { kind: "loading"; departamento: string; municipio?: string }
  | {
      kind: "ready";
      departamento: string;
      municipio?: string;
      bounds: [[number, number], [number, number]];
    }
  | {
      kind: "error";
      departamento: string;
      municipio?: string;
      message: string;
    };

function leafletBbox(map: L.Map): LngLatBBox {
  const bounds = map.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
}

function clusterDivIcon(count: number): L.DivIcon {
  const size = count < 10 ? 28 : count < 100 ? 32 : 40;
  return L.divIcon({
    html: `<span data-point-count="${count}" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:#b45309;color:#fff;font:600 12px/1 system-ui,sans-serif">${count}</span>`,
    className: "cd-cluster",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export type PublicMapProps = {
  pinMode?: boolean;
  origin?: GeoPoint | null;
  onMapClick?: (point: GeoPoint) => void;
  onAskPin?: () => void;
  onVeedorPoint?: (point: GeoPoint) => void;
  selectedCategorias?: readonly Categoria[];
  selectedZone?: PublicMapZoneSelection;
};

export function PublicMap({
  pinMode = false,
  origin = null,
  onMapClick,
  onAskPin,
  onVeedorPoint,
  selectedCategorias = [],
  selectedZone = { kind: "idle" },
}: PublicMapProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const originMarkerRef = useRef<L.CircleMarker | null>(null);
  const indexRef = useRef<PublicClusterIndex | null>(null);
  const pinModeRef = useRef(pinMode);
  pinModeRef.current = pinMode;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const [status, setStatus] = useState<MapStatus>({ kind: "loading" });
  const [detalle, setDetalle] = useState<DetallePanelState | null>(null);
  const [leaves, setLeaves] = useState<LeavesState | null>(null);

  const openDetalle = useCallback(async (id: string) => {
    setLeaves(null);
    setDetalle({ kind: "loading" });
    writeMapDetalleId(id);
    const result = await fetchPublicDetalle(id);
    if (result.ok) {
      setDetalle({ kind: "ready", detalle: result.detalle });
      return;
    }
    if (result.reason === "gone") {
      setDetalle({
        kind: "gone",
        message: result.message ?? YA_NO_ESTA_PUBLICO,
      });
      return;
    }
    setDetalle({ kind: "error" });
  }, []);

  const renderClusters = useCallback(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const index = indexRef.current;
    if (!map || !layer || !index) return;

    layer.clearLayers();
    const zoom = Math.trunc(map.getZoom());
    const items = clustersForView(index, leafletBbox(map), zoom);

    for (const feature of items) {
      const [lon, lat] = feature.geometry.coordinates;
      if (isClusterProperties(feature.properties)) {
        const clusterId = feature.properties.cluster_id;
        const count = feature.properties.point_count;
        const marker = L.marker([lat, lon], { icon: clusterDivIcon(count) });
        marker.on("click", () => {
          const maxZoom = map.getMaxZoom();
          if (canExpandCluster(index, clusterId, zoom, maxZoom)) {
            map.setView(
              [lat, lon],
              Math.min(clusterExpansionZoom(index, clusterId), maxZoom),
            );
            return;
          }
          const page = clusterLeavesPage(index, clusterId, 0);
          setLeaves({
            clusterId,
            ids: page.ids,
            hasMore: page.hasMore,
            offset: 0,
            canZoom: false,
          });
        });
        marker.addTo(layer);
      } else {
        const id = feature.properties.id;
        L.circleMarker([lat, lon], {
          radius: 8,
          color: "#b45309",
          fillColor: "#f59e0b",
          fillOpacity: 0.85,
        })
          .on("click", () => {
            void openDetalle(id);
          })
          .addTo(layer);
      }
    }
  }, [openDetalle]);

  const renderClustersRef = useRef(renderClusters);
  renderClustersRef.current = renderClusters;

  useEffect(() => {
    let cancelled = false;
    void fetchPublicGeojson().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setStatus({ kind: "error" });
        return;
      }
      setStatus({
        kind: "ready",
        collection: result.collection,
        fromCache: result.fromCache,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const saved =
      typeof localStorage !== "undefined"
        ? parseSavedMapView(localStorage.getItem(MAP_VIEW_STORAGE_KEY))
        : null;
    if (saved) {
      map.setView([saved.lat, saved.lon], saved.zoom);
    } else {
      map.fitBounds(L.latLngBounds(COLOMBIA_SOUTH_WEST, COLOMBIA_NORTH_EAST));
    }

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!pinModeRef.current || !onMapClickRef.current) return;
      onMapClickRef.current(toGeoPoint(event.latlng.lat, event.latlng.lng));
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      localStorage.setItem(
        MAP_VIEW_STORAGE_KEY,
        JSON.stringify({
          lat: center.lat,
          lon: center.lng,
          zoom: map.getZoom(),
        }),
      );
      renderClustersRef.current();
    });

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.invalidateSize();

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status.kind !== "ready") {
      indexRef.current = null;
      return;
    }
    const filtered = filterFeaturesByCategoria(
      status.collection.features,
      selectedCategorias,
    );
    indexRef.current = createPublicClusterIndex(filtered);
    renderClusters();
  }, [status, selectedCategorias, renderClusters]);

  useEffect(() => {
    if (status.kind !== "ready") return;
    const deepId = readMapDetalleId();
    if (deepId) {
      void openDetalle(deepId);
    }
  }, [status, openDetalle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!origin) {
      originMarkerRef.current?.remove();
      originMarkerRef.current = null;
      return;
    }
    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([origin.lat, origin.lon]);
    } else {
      originMarkerRef.current = L.circleMarker([origin.lat, origin.lon], {
        radius: 10,
        color: "#1d4ed8",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
      }).addTo(map);
    }
  }, [origin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedZone.kind === "idle" || selectedZone.kind === "loading") {
      return;
    }
    if (selectedZone.kind === "error") return;
    map.fitBounds(L.latLngBounds(selectedZone.bounds), {
      padding: [24, 24],
      maxZoom: selectedZone.municipio ? 12 : 9,
    });
  }, [selectedZone]);

  const emptyFeed =
    status.kind === "ready" && status.collection.features.length === 0;
  const emptyFilter =
    status.kind === "ready" &&
    status.collection.features.length > 0 &&
    filterFeaturesByCategoria(status.collection.features, selectedCategorias)
      .length === 0;

  return (
    <div className="flex flex-col gap-2">
      {status.kind === "ready" && status.fromCache ? (
        <p role="status" className="rounded-md bg-amber-100 px-3 py-2 text-sm">
          {CACHE_BANNER}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm">
          Error de carga. No se muestran puntos.
        </p>
      ) : null}
      {selectedZone.kind === "error" ? (
        <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm">
          {selectedZone.message}
        </p>
      ) : null}
      {emptyFeed ? (
        <p role="status" className="rounded-md bg-stone-100 px-3 py-2 text-sm">
          Aún no hay reportes públicos.
        </p>
      ) : null}
      {emptyFilter ? (
        <p role="status" className="rounded-md bg-stone-100 px-3 py-2 text-sm">
          {FILTRO_VACIO_MESSAGE}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="h-[70vh] min-h-[280px] w-full rounded-md border border-stone-300"
        role="application"
        aria-label="Mapa de denuncias públicas"
        data-leaflet="1.9.4"
        data-attribution="OpenStreetMap"
      />
      {detalle ? (
        <DenunciaDetailPanel
          state={detalle}
          veedorOrigin={origin}
          onAskPin={onAskPin}
          onVeedorPoint={onVeedorPoint}
          onAtestiguoSuccess={(counts) => {
            setDetalle((current) =>
              current?.kind === "ready"
                ? {
                    kind: "ready",
                    detalle: {
                      ...current.detalle,
                      atestiguos_validos: counts.atestiguos_validos,
                      reportes_falsedad: counts.reportes_falsedad,
                      trust_score: counts.trust_score,
                    },
                  }
                : current,
            );
          }}
          onReporteSuccess={(counts) => {
            if (counts.estado === "cuarentena") {
              setDetalle({ kind: "gone", message: YA_NO_ESTA_PUBLICO });
              return;
            }
            setDetalle((current) =>
              current?.kind === "ready"
                ? {
                    kind: "ready",
                    detalle: {
                      ...current.detalle,
                      atestiguos_validos: counts.atestiguos_validos,
                      reportes_falsedad: counts.reportes_falsedad,
                      trust_score: counts.trust_score,
                    },
                  }
                : current,
            );
          }}
          onClose={() => {
            setDetalle(null);
            writeMapDetalleId(null);
          }}
        />
      ) : null}
      {leaves ? (
        <ClusterLeavesPanel
          ids={leaves.ids}
          hasMore={leaves.hasMore}
          canZoom={leaves.canZoom}
          onSelect={(id) => {
            void openDetalle(id);
          }}
          onNext={() => {
            const index = indexRef.current;
            if (!index) return;
            const nextOffset = leaves.offset + leaves.ids.length;
            const page = clusterLeavesPage(index, leaves.clusterId, nextOffset);
            setLeaves({
              ...leaves,
              ids: page.ids,
              hasMore: page.hasMore,
              offset: page.offset,
            });
          }}
          onClose={() => setLeaves(null)}
        />
      ) : null}
    </div>
  );
}
