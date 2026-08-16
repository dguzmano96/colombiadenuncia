import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CercaDeMiControl } from "./CercaDeMiControl";
import { CERCA_EMPTY_MESSAGE, CERCA_ERROR_MESSAGE } from "@/mapa/fetch-denuncias-cerca";

const requestCurrentPosition = vi.hoisted(() => vi.fn());
const fetchDenunciasCerca = vi.hoisted(() => vi.fn());

vi.mock("@/lib/request-current-position", () => ({
  requestCurrentPosition: (...args: unknown[]) =>
    requestCurrentPosition(...args),
}));

vi.mock("@/mapa/fetch-denuncias-cerca", async () => {
  const actual = await vi.importActual<typeof import("@/mapa/fetch-denuncias-cerca")>(
    "@/mapa/fetch-denuncias-cerca",
  );
  return {
    ...actual,
    fetchDenunciasCerca: (...args: unknown[]) => fetchDenunciasCerca(...args),
  };
});

const noop = () => undefined;

describe("CercaDeMiControl", () => {
  beforeEach(() => {
    requestCurrentPosition.mockReset();
    fetchDenunciasCerca.mockReset();
  });

  it("no pide GPS hasta el botón (opt-in)", () => {
    render(
      <CercaDeMiControl
        origin={null}
        pinMode={false}
        onGpsPoint={noop}
        onAskPin={noop}
        onAbortPin={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /cerca de mí/i })).toBeTruthy();
    expect(requestCurrentPosition).not.toHaveBeenCalled();
  });

  it("GPS denegado: mensaje y opción de pin o cancelar", async () => {
    const user = userEvent.setup();
    const onAskPin = vi.fn();
    const onAbortPin = vi.fn();
    requestCurrentPosition.mockResolvedValue({
      ok: false,
      message: "El navegador denegó el GPS. Coloca un pin.",
    });
    render(
      <CercaDeMiControl
        origin={null}
        pinMode={false}
        onGpsPoint={noop}
        onAskPin={onAskPin}
        onAbortPin={onAbortPin}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cerca de mí/i }));
    expect(await screen.findByText(/denegó el GPS/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /colocar pin/i }));
    expect(onAskPin).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(onAbortPin).toHaveBeenCalled();
    expect(fetchDenunciasCerca).not.toHaveBeenCalled();
  });

  it("lista vacía explica la UI", async () => {
    const user = userEvent.setup();
    requestCurrentPosition.mockResolvedValue({
      ok: true,
      point: { lat: 4.6, lon: -74 },
    });
    fetchDenunciasCerca.mockResolvedValue({ ok: true, items: [] });
    render(
      <CercaDeMiControl
        origin={null}
        pinMode={false}
        onGpsPoint={noop}
        onAskPin={noop}
        onAbortPin={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cerca de mí/i }));
    expect(await screen.findByText(CERCA_EMPTY_MESSAGE)).toBeTruthy();
  });

  it("PostGIS down: error controlado (mapa no se toca aquí)", async () => {
    const user = userEvent.setup();
    requestCurrentPosition.mockResolvedValue({
      ok: true,
      point: { lat: 4.6, lon: -74 },
    });
    fetchDenunciasCerca.mockResolvedValue({
      ok: false,
      error: CERCA_ERROR_MESSAGE,
    });
    render(
      <CercaDeMiControl
        origin={null}
        pinMode={false}
        onGpsPoint={noop}
        onAskPin={noop}
        onAbortPin={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cerca de mí/i }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/mapa sigue disponible/i);
  });
});
