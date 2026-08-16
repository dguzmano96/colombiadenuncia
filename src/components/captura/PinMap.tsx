"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toGeoPoint, type GeoPoint } from "@/domain/geo";

const DEFAULT_CENTER: L.LatLngExpression = [4.60971, -74.08175];
const DEFAULT_ZOOM = 12;

type PinMapProps = {
  point: GeoPoint | null;
  onPin: (point: GeoPoint) => void;
};

export function PinMap({ point, onPin }: PinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { attributionControl: true }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onPinRef.current(toGeoPoint(event.latlng.lat, event.latlng.lng));
    });

    mapRef.current = map;
    map.invalidateSize();

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([point.lat, point.lon]);
    } else {
      markerRef.current = L.circleMarker([point.lat, point.lon], {
        radius: 10,
        color: "#b45309",
        fillColor: "#f59e0b",
        fillOpacity: 0.9,
      }).addTo(map);
    }
    map.setView([point.lat, point.lon], Math.max(map.getZoom(), 14));
  }, [point]);

  return (
    <div
      ref={containerRef}
      className="h-56 w-full min-w-[280px] rounded-md border border-stone-300"
      role="application"
      aria-label="Mapa para colocar un pin de ubicación"
    />
  );
}
