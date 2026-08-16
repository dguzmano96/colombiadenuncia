import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DESCARGO_LEGAL } from "@/domain/denuncia";
import { YA_NO_ESTA_PUBLICO } from "@/mapa/public-detalle";
import { DenunciaDetailPanel } from "./DenunciaDetailPanel";

describe("DenunciaDetailPanel", () => {
  it("muestra relato, trust, conteos, foto y descargo; no PII", () => {
    render(
      <DenunciaDetailPanel
        state={{
          kind: "ready",
          detalle: {
            id: "d1",
            categoria: "acaparamiento",
            relato: "Acaparamiento visible en un galpón del barrio centro.",
            trust_score: 4,
            atestiguos_validos: 6,
            reportes_falsedad: 1,
            photo_url: "https://example.test/foto.webp",
          },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("acaparamiento")).toBeTruthy();
    expect(
      screen.getByText(/Acaparamiento visible en un galpón/),
    ).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByAltText("Evidencia pública")).toBeTruthy();
    expect(screen.getByText(DESCARGO_LEGAL)).toBeTruthy();
    expect(screen.queryByText(/user agent|user_agent|\bIP\b|device/i)).toBeNull();
  });

  it("deep link viejo muestra ya no está público", () => {
    render(
      <DenunciaDetailPanel
        state={{ kind: "gone", message: YA_NO_ESTA_PUBLICO }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(YA_NO_ESTA_PUBLICO)).toBeTruthy();
    expect(screen.getByText(DESCARGO_LEGAL)).toBeTruthy();
    expect(screen.queryByText(/error genérico|unexpected/i)).toBeNull();
  });
});
