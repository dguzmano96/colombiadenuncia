import { describe, expect, it } from "vitest";
import { createUpsertQueueItem } from "./sync-queue";

describe("createUpsertQueueItem", () => {
  it("arma el ítem Must de cola", () => {
    const item = createUpsertQueueItem(
      {
        denunciaId: "id-1",
        categoria: "reventa",
        relato: "Relato de prueba con longitud suficiente.",
        lat: 4.6,
        lon: -74.08,
      },
      () => 42,
    );
    expect(item).toEqual({
      tipo: "upsert_denuncia",
      denunciaId: "id-1",
      payload: {
        denunciaId: "id-1",
        categoria: "reventa",
        relato: "Relato de prueba con longitud suficiente.",
        lat: 4.6,
        lon: -74.08,
      },
      intentos: 0,
      proxima_at: 42,
    });
  });
});
