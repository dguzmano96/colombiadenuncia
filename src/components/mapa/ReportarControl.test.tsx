import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportarControl } from "./ReportarControl";

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

describe("ReportarControl", () => {
  it("sin tipo el botón Reportar está deshabilitado", () => {
    render(
      <ReportarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        siteKey="test-key"
      />,
    );
    expect(
      (screen.getByRole("button", { name: /^reportar$/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("elige contenido_falso y envía tipo estructurado + token", async () => {
    const post = vi.fn().mockResolvedValue({
      ok: true,
      counts: {
        atestiguos_validos: 0,
        reportes_falsedad: 1,
        trust_score: -2,
        estado: "publicada",
      },
    });
    vi.stubGlobal("localStorage", {
      getItem: () => "22222222-2222-4222-8222-222222222222",
      setItem: vi.fn(),
    });
    render(
      <ReportarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        post={post}
        siteKey="test-key"
      />,
    );
    await userEvent.click(screen.getByLabelText(/contenido falso/i));
    await userEvent.click(screen.getByRole("button", { name: /^reportar$/i }));
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        turnstileToken: "tok",
        denunciaId: "11111111-1111-4111-8111-111111111111",
        deviceId: "22222222-2222-4222-8222-222222222222",
        tipo: "contenido_falso",
      }),
    );
    expect(await screen.findByText(/reporte registrado/i)).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("Turnstile fail invita a reintentar el reto", async () => {
    const post = vi.fn().mockResolvedValue({
      ok: false,
      error: "turnstile_failed",
      message: "Fallo en la validación del token de seguridad Turnstile.",
    });
    render(
      <ReportarControl
        denunciaId="11111111-1111-4111-8111-111111111111"
        post={post}
        siteKey="test-key"
      />,
    );
    await userEvent.click(screen.getByLabelText(/^spam$/i));
    await userEvent.click(screen.getByRole("button", { name: /^reportar$/i }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/reintenta el reto|token de seguridad/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /^reportar$/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
