import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CATEGORIA_FILTER_KEY } from "@/mapa/filter-categoria";
import { MapaExplorer } from "./MapaExplorer";

const publicMapProps = vi.hoisted(() => ({
  current: {} as {
    selectedZone?: {
      kind: string;
      departamento?: string;
      municipio?: string;
      bounds?: [[number, number], [number, number]];
    };
  },
}));

vi.mock("./PublicMap", () => ({
  PublicMap: (props: { selectedZone?: { kind: string } }) => {
    publicMapProps.current = props;
    return <div role="application" aria-label="Mapa de denuncias públicas" />;
  },
}));

const requestCurrentPosition = vi.hoisted(() => vi.fn());
vi.mock("@/lib/request-current-position", () => ({
  requestCurrentPosition: (...args: unknown[]) =>
    requestCurrentPosition(...args),
}));

describe("MapaExplorer", () => {
  beforeEach(() => {
    sessionStorage.clear();
    publicMapProps.current = {};
  });

  it("el mapa HU-005 permanece montado sin GPS silencioso", () => {
    render(<MapaExplorer />);
    expect(screen.getByRole("application")).toBeTruthy();
    expect(screen.getByRole("button", { name: /cerca de mí/i })).toBeTruthy();
    expect(screen.getByRole("group", { name: /categorías/i })).toBeTruthy();
    expect(requestCurrentPosition).not.toHaveBeenCalled();
  });

  it("muestra la tabla zonal debajo del mapa sin consultar filas al cargar", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<MapaExplorer />);
    expect(screen.getByRole("heading", { name: "Tabla pública por zona" })).toBeTruthy();
    expect(document.getElementById("tabla-zonal")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(publicMapProps.current.selectedZone).toEqual({ kind: "idle" });
  });

  it("Centrar en mapa pasa bounds al mapa de la misma página", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
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
        return new Response(
          JSON.stringify({
            ok: true,
            filas: [
              { departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 3 },
            ],
            meta: {
              page: 1,
              pageSize: 10,
              total: 1,
              hasMore: false,
              departamentos: ["ANTIOQUIA"],
              municipios: ["MEDELLÍN"],
            },
          }),
          { status: 200 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<MapaExplorer />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Departamento" }),
      "ANTIOQUIA",
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    await user.click(
      screen.getByRole("button", {
        name: "Centrar mapa en MEDELLÍN, ANTIOQUIA",
      }),
    );
    await waitFor(() => {
      expect(publicMapProps.current.selectedZone).toMatchObject({
        kind: "ready",
        departamento: "ANTIOQUIA",
        municipio: "MEDELLÍN",
        bounds: [
          [6.1, -75.7],
          [6.4, -75.5],
        ],
      });
    });
  });

  it("persiste la selección de categoría en sessionStorage", async () => {
    const user = userEvent.setup();
    render(<MapaExplorer />);
    await user.click(screen.getByRole("button", { name: "acaparamiento" }));
    expect(JSON.parse(sessionStorage.getItem(CATEGORIA_FILTER_KEY) ?? "[]")).toEqual(
      ["acaparamiento"],
    );
  });
});
