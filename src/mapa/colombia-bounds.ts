export const COLOMBIA_SOUTH_WEST: [number, number] = [-4.227, -81.728];
export const COLOMBIA_NORTH_EAST: [number, number] = [13.514, -66.87];

export const MAP_VIEW_STORAGE_KEY = "cd.mapa.lastView";

export type SavedMapView = {
  lat: number;
  lon: number;
  zoom: number;
};

export function parseSavedMapView(raw: string | null): SavedMapView | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SavedMapView;
    if (
      typeof data.lat !== "number" ||
      typeof data.lon !== "number" ||
      typeof data.zoom !== "number" ||
      !Number.isFinite(data.lat) ||
      !Number.isFinite(data.lon) ||
      !Number.isFinite(data.zoom)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
