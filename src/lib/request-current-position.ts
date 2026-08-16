import { toGeoPoint, type GeoPoint } from "@/domain/geo";

export type GpsResult =
  | { ok: true; point: GeoPoint }
  | { ok: false; message: string };

const GPS_FAIL_HINT =
  "No se pudo obtener el GPS. Coloca un pin en el mapa para indicar la ubicación.";

function mapGeoError(code: number): string {
  if (code === 1) {
    return `El navegador denegó el GPS. ${GPS_FAIL_HINT}`;
  }
  if (code === 2) {
    return `La ubicación no está disponible. ${GPS_FAIL_HINT}`;
  }
  if (code === 3) {
    return `El GPS tardó demasiado. ${GPS_FAIL_HINT}`;
  }
  return GPS_FAIL_HINT;
}

export function requestCurrentPosition(): Promise<GpsResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      message: `Este dispositivo no ofrece geolocalización. ${GPS_FAIL_HINT}`,
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          point: toGeoPoint(
            position.coords.latitude,
            position.coords.longitude,
          ),
        });
      },
      (error) => {
        resolve({ ok: false, message: mapGeoError(error.code) });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
}
