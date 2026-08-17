import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablaZonal } from "./TablaZonal";

function tablaResponse(overrides: {
  filas?: Array<{ departamento: string; municipio: string; cantidad: number }>;
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
  departamentos?: string[];
  municipios?: string[];
} = {}) {
  const filas = overrides.filas ?? [
    { departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 },
  ];
  return new Response(
    JSON.stringify({
      ok: true,
      filas,
      meta: {
        page: overrides.page ?? 1,
        pageSize: overrides.pageSize ?? 10,
        total: overrides.total ?? filas.length,
        hasMore: overrides.hasMore ?? false,
        departamentos: overrides.departamentos ?? ["ANTIOQUIA"],
        municipios: overrides.municipios ?? ["MEDELLÍN"],
      },
    }),
    { status: 200 },
  );
}

describe("TablaZonal", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("no consulta la API al montar sin departamento ni municipio", () => {
    render(<TablaZonal />);
    expect(screen.getByRole("status").textContent).toContain(
      "Selecciona un departamento para consultar la tabla zonal",
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("consulta al seleccionar departamento y muestra filas sin coordenadas ni PII", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.mocked(globalThis.fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<TablaZonal />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    expect(screen.getByRole("status").textContent).toContain("Cargando tabla zonal");
    resolveFetch?.(tablaResponse());
    await waitFor(() => {
      expect(screen.getByRole("table")).toBeTruthy();
    });
    expect(String(vi.mocked(globalThis.fetch).mock.calls[0]?.[0])).toContain(
      "departamento=ANTIOQUIA",
    );
    expect(screen.getAllByText("ANTIOQUIA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MEDELLÍN").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/coordenadas|lat|lon|email/i)).toBeNull();
  });

  it("distingue conjunto vacío y error controlado tras filtrar", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      tablaResponse({ filas: [], municipios: [], total: 0 }),
    );
    const user = userEvent.setup();
    const { unmount } = render(<TablaZonal />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "No hay zonas con información pública",
      );
    });

    unmount();
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: false, filas: [] }), { status: 502 }),
    );
    render(<TablaZonal />);
    await userEvent.setup().selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("No se pudo consultar");
    });
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("mantiene municipio compatible, reinicia página y limpia filtros sin volver a consultar", async () => {
    const requestedUrls: string[] = [];
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      const parsed = new URL(url, "http://localhost");
      const departamento = parsed.searchParams.get("departamento");
      const municipio = parsed.searchParams.get("municipio");
      if (departamento === "ANTIOQUIA" && municipio === "MEDELLÍN") {
        return tablaResponse({
          filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 1 }],
          municipios: ["MEDELLÍN"],
        });
      }
      if (departamento === "ANTIOQUIA") {
        return tablaResponse({
          filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 1 }],
          municipios: ["MEDELLÍN"],
        });
      }
      return tablaResponse();
    });

    const user = userEvent.setup();
    render(<TablaZonal />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "MEDELLÍN" })).toBeTruthy(),
    );
    expect(screen.queryByRole("option", { name: "BOGOTÁ" })).toBeNull();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Municipio" }),
      "MEDELLÍN",
    );
    await waitFor(() =>
      expect(screen.getAllByText("MEDELLÍN").length).toBeGreaterThanOrEqual(1),
    );
    expect(requestedUrls.at(-1)).toContain("page=1");
    expect(requestedUrls.at(-1)).toContain("departamento=ANTIOQUIA");

    const callsBeforeClear = requestedUrls.length;
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("combobox", { name: "Departamento" }) as HTMLSelectElement)
          .value,
      ).toBe(""),
    );
    expect(requestedUrls.length).toBe(callsBeforeClear);
    expect(screen.getByRole("status").textContent).toContain(
      "Selecciona un departamento para consultar la tabla zonal",
    );
  });

  it("pagina de a 10 y reemplaza las filas al avanzar", async () => {
    const requestedUrls: string[] = [];
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      const page = new URL(url, "http://localhost").searchParams.get("page");
      const fila =
        page === "2"
          ? { departamento: "ANTIOQUIA", municipio: "ITAGÜÍ", cantidad: 3 }
          : { departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 };
      return tablaResponse({
        filas: [fila],
        page: Number(page),
        pageSize: 10,
        total: 12,
        hasMore: page === "1",
        municipios: ["ITAGÜÍ", "MEDELLÍN"],
      });
    });

    const user = userEvent.setup();
    render(<TablaZonal />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() =>
      expect(screen.getByRole("row", { name: /MEDELLÍN/ })).toBeTruthy(),
    );
    expect(
      (screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByText("Hay más resultados disponibles.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() =>
      expect(screen.getByRole("row", { name: /ITAGÜÍ/ })).toBeTruthy(),
    );
    expect(screen.queryByRole("row", { name: /MEDELLÍN/ })).toBeNull();
    expect(requestedUrls.at(-1)).toContain("page=2");
    expect(
      (screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("descarta una respuesta tardía de un filtro anterior", async () => {
    let resolveAntioquia: ((response: Response) => void) | undefined;
    let resolveCundinamarca: ((response: Response) => void) | undefined;
    const antioquiaResponse = new Promise<Response>((resolve) => {
      resolveAntioquia = resolve;
    });
    const cundinamarcaResponse = new Promise<Response>((resolve) => {
      resolveCundinamarca = resolve;
    });

    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const departamento = new URL(String(input), "http://localhost").searchParams.get(
        "departamento",
      );
      if (departamento === "ANTIOQUIA") return antioquiaResponse;
      if (departamento === "CUNDINAMARCA") return cundinamarcaResponse;
      return Promise.resolve(tablaResponse());
    });

    const user = userEvent.setup();
    render(<TablaZonal />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "CUNDINAMARCA",
    );

    resolveAntioquia?.(
      tablaResponse({
        filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
        municipios: ["MEDELLÍN"],
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("MEDELLÍN")).toBeNull();

    resolveCundinamarca?.(
      tablaResponse({
        filas: [{ departamento: "CUNDINAMARCA", municipio: "SOACHA", cantidad: 4 }],
        departamentos: ["CUNDINAMARCA"],
        municipios: ["SOACHA"],
      }),
    );
    await waitFor(() =>
      expect(screen.getAllByText("SOACHA").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("MEDELLÍN")).toBeNull();
  });

  it("conserva filtros y reintenta la página que falló", async () => {
    const requestedUrls: string[] = [];
    let filteredAttempt = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      filteredAttempt += 1;
      if (filteredAttempt === 1) {
        return new Response(JSON.stringify({ ok: false, filas: [] }), {
          status: 502,
        });
      }
      return tablaResponse({
        filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
        municipios: ["MEDELLÍN"],
      });
    });

    const user = userEvent.setup();
    render(<TablaZonal />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(
      (screen.getByRole("combobox", { name: "Departamento" }) as HTMLSelectElement)
        .value,
    ).toBe("ANTIOQUIA");

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(screen.getAllByText("MEDELLÍN").length).toBeGreaterThan(0),
    );
    expect(requestedUrls.at(-1)).toContain("departamento=ANTIOQUIA");
    expect(requestedUrls.at(-1)).toContain("page=1");
  });

  it("seleccionar una fila resuelve bounds y notifica onSelectZona con estado ready", async () => {
    const onSelectZona = vi.fn();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/denuncias/zonas")) {
        return new Response(
          JSON.stringify({
            ok: true,
            bounds: [
              [6.1, -75.7],
              [6.4, -75.5],
            ],
            nivel: "municipio",
          }),
          { status: 200 },
        );
      }
      return tablaResponse({
        filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 3 }],
        municipios: ["MEDELLÍN"],
      });
    });

    const user = userEvent.setup();
    render(<TablaZonal onSelectZona={onSelectZona} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());

    const centerButton = screen.getByRole("button", {
      name: "Centrar mapa en MEDELLÍN, ANTIOQUIA",
    });
    await user.click(centerButton);

    await waitFor(() => {
      expect(onSelectZona).toHaveBeenCalledWith({
        kind: "ready",
        departamento: "ANTIOQUIA",
        municipio: "MEDELLÍN",
        bounds: [
          [6.1, -75.7],
          [6.4, -75.5],
        ],
      });
    });

    const row = screen.getByRole("row", {
      name: /ANTIOQUIA MEDELLÍN 3 Centrar en mapa/,
    });
    expect(row.getAttribute("aria-selected")).toBe("true");
  });

  it("al fallar la geometría muestra error controlado y conserva filtros, filas y conteos", async () => {
    const onSelectZona = vi.fn();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/denuncias/zonas")) {
        return new Response(
          JSON.stringify({ ok: false, error: "geometria_no_disponible" }),
          { status: 404 },
        );
      }
      return tablaResponse({
        filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 5 }],
        municipios: ["MEDELLÍN"],
      });
    });

    const user = userEvent.setup();
    render(<TablaZonal onSelectZona={onSelectZona} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());

    const centerButton = screen.getByRole("button", {
      name: "Centrar mapa en MEDELLÍN, ANTIOQUIA",
    });
    await user.click(centerButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByRole("alert").textContent).toContain("Geometría no disponible");
    expect(onSelectZona).toHaveBeenCalledWith({
      kind: "error",
      departamento: "ANTIOQUIA",
      municipio: "MEDELLÍN",
      message: "Geometría no disponible para la zona seleccionada.",
    });

    expect(screen.getAllByText("MEDELLÍN").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("5")).toBeTruthy();
    const row = screen.getByRole("row", {
      name: /ANTIOQUIA MEDELLÍN 5 Centrar en mapa/,
    });
    expect(row.getAttribute("aria-selected")).toBe("true");
  });

  it("permite seleccionar una fila con conteo cero y mantiene el conteo visible", async () => {
    const onSelectZona = vi.fn();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/denuncias/zonas")) {
        return new Response(
          JSON.stringify({
            ok: true,
            bounds: [
              [5.0, -75.6],
              [5.2, -75.4],
            ],
            nivel: "municipio",
          }),
          { status: 200 },
        );
      }
      return tablaResponse({
        filas: [{ departamento: "CALDAS", municipio: "MANIZALES", cantidad: 0 }],
        departamentos: ["CALDAS"],
        municipios: ["MANIZALES"],
      });
    });

    const user = userEvent.setup();
    render(<TablaZonal onSelectZona={onSelectZona} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "CALDAS",
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());

    const countZero = screen.getByText("0");
    expect(countZero).toBeTruthy();

    const centerButton = screen.getByRole("button", {
      name: "Centrar mapa en MANIZALES, CALDAS",
    });
    await user.click(centerButton);

    await waitFor(() => {
      expect(onSelectZona).toHaveBeenCalledWith({
        kind: "ready",
        departamento: "CALDAS",
        municipio: "MANIZALES",
        bounds: [
          [5.0, -75.6],
          [5.2, -75.4],
        ],
      });
    });

    expect(screen.getByText("0")).toBeTruthy();
  });
});
