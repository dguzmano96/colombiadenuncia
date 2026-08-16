import { describe, expect, it } from "vitest";
import type { PublicFeature } from "./public-geojson";
import {
  CATEGORIA_FILTER_KEY,
  filterFeaturesByCategoria,
  readCategoriaFilter,
  writeCategoriaFilter,
} from "./filter-categoria";

function point(id: string, categoria: string): PublicFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-74.08, 4.61] },
    properties: {
      id,
      categoria,
      lon: -74.08,
      lat: 4.61,
      trust_score: 0,
      atestiguos_validos: 0,
      reportes_falsedad: 0,
    },
  };
}

const sample = [
  point("a1", "acaparamiento"),
  point("a2", "acaparamiento"),
  point("r1", "reventa"),
];

describe("filterFeaturesByCategoria", () => {
  it("2 acaparamientos + 1 reventa: solo acaparamiento = 2 features", () => {
    const filtered = filterFeaturesByCategoria(sample, ["acaparamiento"]);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((f) => f.properties.id)).toEqual(["a1", "a2"]);
  });

  it("ningún chip seleccionado se trata como todas", () => {
    expect(filterFeaturesByCategoria(sample, [])).toHaveLength(3);
  });

  it("categorías inválidas se tratan como todas", () => {
    expect(filterFeaturesByCategoria(sample, ["no-existe"])).toHaveLength(3);
  });

  it("filtro sin matches deja 0 features (estado vacío, no error)", () => {
    const filtered = filterFeaturesByCategoria(sample, ["desvío"]);
    expect(filtered).toHaveLength(0);
  });
});

describe("categoria filter sessionStorage", () => {
  it("persiste y rehidrata la selección", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    writeCategoriaFilter(["reventa", "otro"], storage);
    expect(store.get(CATEGORIA_FILTER_KEY)).toBe(JSON.stringify(["reventa", "otro"]));
    expect(readCategoriaFilter(storage)).toEqual(["reventa", "otro"]);
  });

  it("sessionStorage lleno o bloqueado: el filtro igual aplica en memoria", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(() => writeCategoriaFilter(["acaparamiento"], blocked)).not.toThrow();
    expect(readCategoriaFilter(blocked)).toEqual([]);
    const inMemory = filterFeaturesByCategoria(sample, ["acaparamiento"]);
    expect(inMemory).toHaveLength(2);
  });
});
