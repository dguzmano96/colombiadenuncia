import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AtestiguarControl, GPS_DENIED_ATESTIGUAR } from "./AtestiguarControl";

vi.mock("@/components/sync/TurnstileWidget", () => ({
  TurnstileWidget: ({
    handleRef,
  }: {
    handleRef: { current: { getToken: () => Promise<string>; reset: () => void } | null };
  }) => {
    handleRef.current = {
      getToken: async () => "tok",
      reset: () => undefined,
    };
    return <div data-testid="turnstile-widget" />;
  },
}));

const geopunto = { lat: 4.6, lon: -74 };

describe("AtestiguarControl", () => {
  it("120 m habilita Atestiguar", () => {
    render(
      <AtestiguarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        geopunto={geopunto}
        veedorOrigin={{ lat: 4.601078, lon: -74 }}
        siteKey="test-key"
      />,
    );
    expect(
      (screen.getByRole("button", { name: /^atestiguar$/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("1200 m deshabilita y muestra metros enteros", () => {
    render(
      <AtestiguarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        geopunto={geopunto}
        veedorOrigin={{ lat: 4.61078, lon: -74 }}
        siteKey="test-key"
      />,
    );
    const btn = screen.getByRole("button", {
      name: /^atestiguar$/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const status = screen.getByRole("status").textContent ?? "";
    expect(status).toMatch(/\d+ m/);
    const meters = Number((status.match(/(\d+) m/) ?? [])[1]);
    expect(meters).toBeGreaterThan(1100);
    expect(Number.isInteger(meters)).toBe(true);
  });

  it("GPS denegado bloquea y pide pin de veedor", async () => {
    const onAskPin = vi.fn();
    const requestPosition = vi.fn().mockResolvedValue({
      ok: false,
      message: "El navegador denegó el GPS.",
    });
    const post = vi.fn();
    render(
      <AtestiguarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        geopunto={geopunto}
        onAskPin={onAskPin}
        requestPosition={requestPosition}
        post={post}
        siteKey="test-key"
      />,
    );
    expect(await screen.findByText(new RegExp(GPS_DENIED_ATESTIGUAR))).toBeTruthy();
    const btn = screen.getByRole("button", {
      name: /^atestiguar$/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await userEvent.click(
      screen.getByRole("button", { name: /usar pin de veedor/i }),
    );
    expect(onAskPin).toHaveBeenCalledOnce();
    expect(post).not.toHaveBeenCalled();
  });

  it("happy path: pulsar Atestiguar envía token y coords", async () => {
    const post = vi.fn().mockResolvedValue({
      ok: true,
      counts: { atestiguos_validos: 1, reportes_falsedad: 0, trust_score: 1 },
    });
    vi.stubGlobal("localStorage", {
      getItem: () => "22222222-2222-4222-8222-222222222222",
      setItem: vi.fn(),
    });
    render(
      <AtestiguarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        geopunto={geopunto}
        veedorOrigin={{ lat: 4.601078, lon: -74 }}
        post={post}
        siteKey="test-key"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^atestiguar$/i }));
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        turnstileToken: "tok",
        denunciaId: "11111111-1111-4111-8111-111111111111",
        deviceId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(await screen.findByText(/atestiguo registrado/i)).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
