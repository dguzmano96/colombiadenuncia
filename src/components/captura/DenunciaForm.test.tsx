import { describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DenunciaForm } from "./DenunciaForm";
import * as denunciaStore from "@/storage/local-denuncia-store";

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockPin() {
      return <div data-testid="pin-map">pin-map</div>;
    }
    return MockPin;
  },
}));

const relatoOk =
  "Hay acaparamiento de kits de alimentos en un punto de acopio del barrio.";

describe("DenunciaForm", () => {
  it("no solicita nombre, documento, teléfono ni email", () => {
    render(<DenunciaForm />);
    expect(screen.queryByLabelText(/nombre/i)).toBeNull();
    expect(screen.queryByLabelText(/documento/i)).toBeNull();
    expect(screen.queryByLabelText(/tel[eé]fono/i)).toBeNull();
    expect(screen.queryByLabelText(/email|correo/i)).toBeNull();
    expect(document.querySelector('input[name="nombre"]')).toBeNull();
    expect(document.querySelector('input[name="documento"]')).toBeNull();
    expect(document.querySelector('input[name="telefono"]')).toBeNull();
    expect(document.querySelector('input[name="email"]')).toBeNull();
  });

  it("muestra el descargo legal antes de Guardar y no crea denuncia sin checkbox", async () => {
    const user = userEvent.setup();
    render(<DenunciaForm />);
    expect(screen.getByText(/no constituye denuncia penal/i)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(/categoría/i), "acaparamiento");
    await user.type(screen.getByLabelText(/relato/i), relatoOk);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(/confirmar el descargo legal/i),
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("muestra error accionable si GPS falla y deja el pin disponible", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      onLine: true,
      geolocation: {
        getCurrentPosition: (
          _ok: PositionCallback,
          err: PositionErrorCallback,
        ) => {
          err({
            code: 1,
            message: "denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    });
    render(<DenunciaForm />);
    await user.click(screen.getByRole("button", { name: "Usar GPS" }));
    expect(
      await screen.findByText(/denegó el GPS/i),
    ).toBeTruthy();
    expect(screen.getByText(/coloca un pin en el mapa/i)).toBeTruthy();
    expect(screen.getByTestId("pin-map")).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("permite guardar la denuncia sin foto (foto opcional)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      onLine: true,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: {
              latitude: 4.60971,
              longitude: -74.08175,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
    render(<DenunciaForm />);
    const foto = document.querySelector('input[name="foto"]');
    expect(foto).toBeTruthy();
    expect((foto as HTMLInputElement).required).toBe(false);
    await user.selectOptions(screen.getByLabelText(/categoría/i), "acaparamiento");
    await user.type(screen.getByLabelText(/relato/i), relatoOk);
    await user.click(screen.getByRole("button", { name: "Usar GPS" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect((await screen.findByRole("status")).textContent).toMatch(
      /pendiente de sincronizar \(pendiente_sync/i,
    );
    expect(screen.getByRole("status").textContent?.toLowerCase()).not.toMatch(
      /enviada/,
    );
    vi.unstubAllGlobals();
  });

  it("indica pendiente_sync en español cuando no hay conexión", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      onLine: false,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: {
              latitude: 4.60971,
              longitude: -74.08175,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
    render(<DenunciaForm />);
    await user.selectOptions(screen.getByLabelText(/categoría/i), "acaparamiento");
    await user.type(screen.getByLabelText(/relato/i), relatoOk);
    await user.click(screen.getByRole("button", { name: "Usar GPS" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/pendiente_sync/);
    expect(status.textContent).toMatch(/sin conexión/i);
    vi.unstubAllGlobals();
  });

  it("muestra error de persistencia y no afirma enviada", async () => {
    const user = userEvent.setup();
    vi.spyOn(denunciaStore, "saveDenuncia").mockResolvedValue({
      ok: false,
      persistError: true,
      message:
        "No se pudo guardar en este dispositivo. La denuncia no se envió.",
    });
    vi.stubGlobal("navigator", {
      ...navigator,
      onLine: true,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: {
              latitude: 4.60971,
              longitude: -74.08175,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
    render(<DenunciaForm />);
    await user.selectOptions(screen.getByLabelText(/categoría/i), "acaparamiento");
    await user.type(screen.getByLabelText(/relato/i), relatoOk);
    await user.click(screen.getByRole("button", { name: "Usar GPS" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(/no se pudo guardar en este dispositivo/i),
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert").textContent?.toLowerCase()).not.toMatch(
      /enviada/,
    );
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("mantiene el relato editable mientras se muestra el campo de foto", async () => {
    const user = userEvent.setup();
    render(<DenunciaForm />);
    const relato = screen.getByLabelText(/relato/i) as HTMLTextAreaElement;
    expect(relato.disabled).toBe(false);
    await user.type(relato, "texto durante encode");
    expect(relato.value).toBe("texto durante encode");
  });

  it("reacciona al evento synced cambiando a éxito y mostrando enlace al mapa", async () => {
    const user = userEvent.setup();
    vi.spyOn(denunciaStore, "saveDenuncia").mockResolvedValue({
      ok: true,
      denuncia: {
        id: "den-react-1",
        categoria: "acaparamiento",
        relato: relatoOk,
        lat: 4.6,
        lon: -74.08,
        estado: "pendiente_sync",
      },
    });
    render(<DenunciaForm />);
    await user.selectOptions(screen.getByLabelText(/categoría/i), "acaparamiento");
    await user.type(screen.getByLabelText(/relato/i), relatoOk);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/pendiente de sincronizar/i)).toBeTruthy();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("colombiadenuncia:synced", {
          detail: { denunciaId: "den-react-1" },
        }),
      );
    });

    expect(
      await screen.findByText(/¡Denuncia sincronizada y publicada con éxito!/i),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver en el mapa/i })).toBeTruthy();
    vi.restoreAllMocks();
  });

  it("reacciona al evento sync-error mostrando alerta con detalle del error y botón reintentar", async () => {
    const user = userEvent.setup();
    vi.spyOn(denunciaStore, "saveDenuncia").mockResolvedValue({
      ok: true,
      denuncia: {
        id: "den-react-err",
        categoria: "acaparamiento",
        relato: relatoOk,
        lat: 4.6,
        lon: -74.08,
        estado: "pendiente_sync",
      },
    });
    const retrySpy = vi.spyOn(denunciaStore, "retryDenunciaSync").mockResolvedValue(undefined);

    render(<DenunciaForm />);
    await user.selectOptions(screen.getByLabelText(/categoría/i), "acaparamiento");
    await user.type(screen.getByLabelText(/relato/i), relatoOk);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/pendiente de sincronizar/i)).toBeTruthy();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("colombiadenuncia:sync-error", {
          detail: {
            denunciaId: "den-react-err",
            error: "server_misconfigured",
            message: "Falta configurar TURNSTILE_SECRET_KEY.",
          },
        }),
      );
    });

    expect(
      await screen.findByText(/Error al sincronizar la denuncia/i),
    ).toBeTruthy();
    expect(screen.getByText(/TURNSTILE_SECRET_KEY/i)).toBeTruthy();

    const retryBtn = screen.getByRole("button", {
      name: /Reintentar sincronización ahora/i,
    });
    await user.click(retryBtn);
    expect(retrySpy).toHaveBeenCalledWith("den-react-err");
    vi.restoreAllMocks();
  });
});
