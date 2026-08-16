import { isCategoria, type Categoria } from "@/domain/denuncia";
import type { PublicFeature } from "./public-geojson";

export const CATEGORIA_FILTER_KEY = "colombiadenuncia.mapa.categorias";

export const FILTRO_VACIO_MESSAGE =
  "No hay reportes en las categorías seleccionadas.";

function defaultSessionStorage(): Storage | null {
  return typeof sessionStorage === "undefined" ? null : sessionStorage;
}

export function sanitizeCategoriaSelection(
  values: readonly unknown[],
): Categoria[] {
  return values.filter(
    (value): value is Categoria =>
      typeof value === "string" && isCategoria(value),
  );
}

export function filterFeaturesByCategoria(
  features: readonly PublicFeature[],
  selected: readonly string[],
): PublicFeature[] {
  const allowed = new Set<string>(sanitizeCategoriaSelection(selected));
  if (allowed.size === 0) {
    return [...features];
  }
  return features.filter((feature) => allowed.has(feature.properties.categoria));
}

export function readCategoriaFilter(
  storage: Pick<Storage, "getItem"> | null = defaultSessionStorage(),
): Categoria[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CATEGORIA_FILTER_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitizeCategoriaSelection(parsed);
  } catch {
    return [];
  }
}

export function writeCategoriaFilter(
  selected: readonly string[],
  storage: Pick<Storage, "setItem"> | null = defaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      CATEGORIA_FILTER_KEY,
      JSON.stringify(sanitizeCategoriaSelection(selected)),
    );
  } catch {
    // QuotaExceeded o storage bloqueado: el filtro sigue en memoria.
  }
}
