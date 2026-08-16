import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncDrain } from "./SyncDrain";
import * as localStore from "@/storage/local-denuncia-store";

vi.mock("@/components/sync/TurnstileWidget", () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget" />,
}));

describe("SyncDrain", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(localStore, "listSyncQueue").mockResolvedValue([]);
    vi.spyOn(localStore, "resumePausedQueue").mockResolvedValue(undefined);
  });

  it("drena al montar si navigator.onLine", async () => {
    const drain = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    render(<SyncDrain siteKey="public-site-key" drain={drain} />);
    await waitFor(() => expect(drain).toHaveBeenCalled());
  });

  it("drena en el evento online", async () => {
    const drain = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(<SyncDrain siteKey="public-site-key" drain={drain} />);
    expect(drain).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(drain).toHaveBeenCalled());
  });

  it("muestra estado pausado y botón de reintento manual", async () => {
    vi.spyOn(localStore, "listSyncQueue").mockResolvedValue([
      {
        id: 1,
        tipo: "upsert_denuncia",
        denunciaId: "den-1",
        payload: {
          denunciaId: "den-1",
          categoria: "otro",
          relato: "Relato largo para prueba",
          lat: 4.6,
          lon: -74,
        },
        intentos: 8,
        proxima_at: Number.MAX_SAFE_INTEGER,
        lastError: "server_misconfigured",
      },
    ]);

    const user = userEvent.setup();
    const drain = vi.fn().mockResolvedValue(undefined);
    render(<SyncDrain siteKey="public-site-key" drain={drain} />);

    expect(
      await screen.findByText(/Sincronización en pausa tras varios intentos/i),
    ).toBeTruthy();
    expect(screen.getByText(/TURNSTILE_SECRET_KEY o Supabase/i)).toBeTruthy();

    const retryBtn = screen.getByRole("button", { name: /Reintentar envío/i });
    await user.click(retryBtn);
    expect(localStore.resumePausedQueue).toHaveBeenCalled();
    expect(drain).toHaveBeenCalled();
  });

  it("muestra error al sincronizar cuando hay elementos en cola con fallo", async () => {
    vi.spyOn(localStore, "listSyncQueue").mockResolvedValue([
      {
        id: 1,
        tipo: "upsert_denuncia",
        denunciaId: "den-1",
        payload: {
          denunciaId: "den-1",
          categoria: "otro",
          relato: "Relato largo para prueba",
          lat: 4.6,
          lon: -74,
        },
        intentos: 1,
        proxima_at: 1000,
        lastError: "turnstile_failed",
      },
    ]);

    const user = userEvent.setup();
    const drain = vi.fn().mockResolvedValue(undefined);
    render(<SyncDrain siteKey="public-site-key" drain={drain} />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Turnstile/i)).toBeTruthy();

    const retryBtn = screen.getByRole("button", { name: /Reintentar ahora/i });
    await user.click(retryBtn);
    expect(localStore.resumePausedQueue).toHaveBeenCalled();
  });
});
