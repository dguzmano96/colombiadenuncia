import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const fetchPublicGeojson = vi.hoisted(() => vi.fn());
const mapMock = vi.hoisted(() => ({
  setView: vi.fn(),
  fitBounds: vi.fn(),
  on: vi.fn(),
  invalidateSize: vi.fn(),
  remove: vi.fn(),
  getCenter: () => ({ lat: 4.6, lng: -74 }),
  getZoom: () => 6,
  getMaxZoom: () => 19,
  getBounds: () => ({
    getWest: () => -80,
    getSouth: () => -5,
    getEast: () => -66,
    getNorth: () => 13,
  }),
}));

vi.mock("@/mapa/fetch-public-geojson", () => ({
  CACHE_BANNER: "datos de caché",
  fetchPublicGeojson: (...args: unknown[]) => fetchPublicGeojson(...args),
}));

vi.mock("leaflet", () => {
  const layer = { addTo: vi.fn(), clearLayers: vi.fn() };
  return {
    default: {
      map: vi.fn(() => mapMock),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      latLngBounds: vi.fn((bounds) => bounds),
      layerGroup: vi.fn(() => ({ addTo: vi.fn(() => layer) })),
      circleMarker: vi.fn(() => ({ on: vi.fn(() => ({ addTo: vi.fn() })) })),
      marker: vi.fn(() => ({ on: vi.fn(), addTo: vi.fn() })),
      divIcon: vi.fn(() => ({})),
    },
  };
});

vi.mock("leaflet/dist/leaflet.css", () => ({}));

describe("PublicMap", () => {
  beforeEach(() => {
    fetchPublicGeojson.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: vi.fn(),
    });
  });

  it("mapa vacío muestra mensaje de reportes públicos", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: false,
      collection: { type: "FeatureCollection", features: [] },
    });
    const { PublicMap } = await import("./PublicMap");
    render(<PublicMap />);
    expect(
      await screen.findByText(/aún no hay reportes públicos/i),
    ).toBeTruthy();
  });

  it("error de carga no inventa puntos y avisa", async () => {
    fetchPublicGeojson.mockResolvedValue({ ok: false, fromCache: false });
    const { PublicMap } = await import("./PublicMap");
    render(<PublicMap />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toMatch(/error de carga/i);
    expect(screen.queryByText(/aún no hay reportes públicos/i)).toBeNull();
  });

  it("muestra banner de datos de caché", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: true,
      collection: { type: "FeatureCollection", features: [] },
    });
    const { PublicMap } = await import("./PublicMap");
    render(<PublicMap />);
    expect(await screen.findByText("datos de caché")).toBeTruthy();
  });

  it("filtro sin matches muestra vacío, no error, y el mapa base sigue", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: false,
      collection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-74.08, 4.61] },
            properties: {
              id: "a1",
              categoria: "acaparamiento",
              lon: -74.08,
              lat: 4.61,
              trust_score: 0,
              atestiguos_validos: 0,
              reportes_falsedad: 0,
            },
          },
        ],
      },
    });
    const { PublicMap } = await import("./PublicMap");
    render(<PublicMap selectedCategorias={["reventa"]} />);
    expect(
      await screen.findByText(/no hay reportes en las categorías seleccionadas/i),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("application")).toBeTruthy();
  });

  it("no rastrea GPS y declara atribución OSM / Leaflet 1.9.4", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: false,
      collection: { type: "FeatureCollection", features: [] },
    });
    const geo = { getCurrentPosition: vi.fn() };
    vi.stubGlobal("navigator", { ...navigator, geolocation: geo, onLine: true });
    const { PublicMap } = await import("./PublicMap");
    render(<PublicMap />);
    await screen.findByText(/aún no hay reportes públicos/i);
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    const mapEl = screen.getByRole("application");
    expect(mapEl.getAttribute("data-attribution")).toBe("OpenStreetMap");
    expect(mapEl.getAttribute("data-leaflet")).toBe("1.9.4");
  });

  it("centra el mapa con fitBounds y maxZoom 12 para municipio seleccionado", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: false,
      collection: { type: "FeatureCollection", features: [] },
    });
    mapMock.fitBounds.mockClear();
    const { PublicMap } = await import("./PublicMap");
    render(
      <PublicMap
        selectedZone={{
          kind: "ready",
          departamento: "ANTIOQUIA",
          municipio: "MEDELLÍN",
          bounds: [
            [6.1, -75.7],
            [6.4, -75.5],
          ],
        }}
      />,
    );
    expect(mapMock.fitBounds).toHaveBeenCalledWith(
      [
        [6.1, -75.7],
        [6.4, -75.5],
      ],
      { padding: [24, 24], maxZoom: 12 },
    );
  });

  it("centra el mapa con fitBounds y maxZoom 9 para departamento sin municipio", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: false,
      collection: { type: "FeatureCollection", features: [] },
    });
    mapMock.fitBounds.mockClear();
    const { PublicMap } = await import("./PublicMap");
    render(
      <PublicMap
        selectedZone={{
          kind: "ready",
          departamento: "ANTIOQUIA",
          bounds: [
            [5.4, -77.1],
            [8.9, -73.8],
          ],
        }}
      />,
    );
    expect(mapMock.fitBounds).toHaveBeenCalledWith(
      [
        [5.4, -77.1],
        [8.9, -73.8],
      ],
      { padding: [24, 24], maxZoom: 9 },
    );
  });

  it("muestra alerta controlada ante error de zona sin alterar mapa", async () => {
    fetchPublicGeojson.mockResolvedValue({
      ok: true,
      fromCache: false,
      collection: { type: "FeatureCollection", features: [] },
    });
    mapMock.fitBounds.mockClear();
    const { PublicMap } = await import("./PublicMap");
    render(
      <PublicMap
        selectedZone={{
          kind: "error",
          departamento: "ANTIOQUIA",
          municipio: "DESCONOCIDO",
          message: "Geometría no disponible para la zona seleccionada.",
        }}
      />,
    );
    expect(
      await screen.findByText("Geometría no disponible para la zona seleccionada."),
    ).toBeTruthy();
    expect(screen.getByRole("application")).toBeTruthy();
  });
});
