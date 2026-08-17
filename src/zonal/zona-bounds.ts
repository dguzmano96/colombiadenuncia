import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type Coordinates = number | Coordinates[];

export type ZonaFeature = {
  geometry?: {
    coordinates?: Coordinates;
  } | null;
  properties?: Record<string, unknown> | null;
};

export type ZonaSnapshot = {
  features?: ZonaFeature[];
};

export type ZonaBounds = [[number, number], [number, number]];

export type ResultadoZonaBounds =
  | { ok: true; bounds: ZonaBounds; nivel: "departamento" | "municipio" }
  | { ok: false; reason: "not_found" | "invalid_snapshot" };

export const SNAPSHOT_PATH = join(
  process.cwd(),
  "supabase",
  "snapshots",
  "mgn-2024-municipios.geojson",
);

const DEPARTMENT_FIELDS = ["DPTO_CNMBR", "dpto_cnmbr", "DPTO_NOMBRE", "departamento"];
const MUNICIPALITY_FIELDS = ["MPIO_CNMBR", "mpio_cnmbr", "MPIO_NOMBRE", "municipio"];

function normalizedValue(
  properties: Record<string, unknown> | null | undefined,
  fields: string[],
): string | undefined {
  if (!properties) return undefined;
  for (const field of fields) {
    const value = properties[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLocaleUpperCase("es-CO");
    }
  }
  return undefined;
}

function collectBounds(
  coordinates: Coordinates | undefined,
  bounds: { south: number; west: number; north: number; east: number },
): void {
  if (!Array.isArray(coordinates)) return;
  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    const [lon, lat] = coordinates;
    bounds.south = Math.min(bounds.south, lat);
    bounds.west = Math.min(bounds.west, lon);
    bounds.north = Math.max(bounds.north, lat);
    bounds.east = Math.max(bounds.east, lon);
    return;
  }
  for (const nested of coordinates) {
    collectBounds(nested, bounds);
  }
}

export function resolveZonaBounds(
  snapshot: ZonaSnapshot,
  departamento: string,
  municipio?: string,
): ResultadoZonaBounds {
  if (!Array.isArray(snapshot.features)) {
    return { ok: false, reason: "invalid_snapshot" };
  }

  const expectedDepartment = departamento.trim().toLocaleUpperCase("es-CO");
  const expectedMunicipality = municipio?.trim().toLocaleUpperCase("es-CO");
  const matchingFeatures = snapshot.features.filter((feature) => {
    const properties = feature.properties;
    const sameDepartment =
      normalizedValue(properties, DEPARTMENT_FIELDS) === expectedDepartment;
    const sameMunicipality =
      !expectedMunicipality ||
      normalizedValue(properties, MUNICIPALITY_FIELDS) === expectedMunicipality;
    return sameDepartment && sameMunicipality;
  });

  const bounds = {
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
  };
  for (const feature of matchingFeatures) {
    collectBounds(feature.geometry?.coordinates, bounds);
  }

  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east)
  ) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    bounds: [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ],
    nivel: expectedMunicipality ? "municipio" : "departamento",
  };
}

export async function readZonaSnapshot(snapshotPath: string = SNAPSHOT_PATH): Promise<ZonaSnapshot> {
  const source = await readFile(snapshotPath, "utf8");
  return JSON.parse(source) as ZonaSnapshot;
}
