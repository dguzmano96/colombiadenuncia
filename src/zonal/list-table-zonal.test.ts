import { describe, expect, it, vi } from "vitest";
import { listTablaZonal } from "./list-table-zonal";

function query(result: {
  data: unknown[];
  error: null;
  count?: number;
}) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (
      resolve: (value: typeof result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

describe("listTablaZonal", () => {
  it("filtra departamento y municipio juntos y solo pagina las filas", async () => {
    const rows = query({
      data: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
      error: null,
      count: 51,
    });
    const departments = query({
      data: [{ departamento: "ANTIOQUIA" }, { departamento: "ANTIOQUIA" }],
      error: null,
    });
    const municipalities = query({
      data: [{ municipio: "MEDELLÍN" }, { municipio: "MEDELLÍN" }],
      error: null,
    });
    const client = {
      from: vi
        .fn()
        .mockReturnValueOnce(rows)
        .mockReturnValueOnce(departments)
        .mockReturnValueOnce(municipalities),
    };

    const result = await listTablaZonal(client as never, {
      departamento: "ANTIOQUIA",
      municipio: "MEDELLÍN",
      page: 2,
    });

    expect(rows.select).toHaveBeenCalledWith("departamento,municipio,cantidad", {
      count: "exact",
    });
    expect(rows.eq).toHaveBeenCalledWith("departamento", "ANTIOQUIA");
    expect(rows.eq).toHaveBeenCalledWith("municipio", "MEDELLÍN");
    expect(rows.range).toHaveBeenCalledWith(25, 49);
    expect(result).toEqual({
      filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
      meta: {
        page: 2,
        pageSize: 25,
        total: 51,
        hasMore: true,
        departamentos: ["ANTIOQUIA"],
        municipios: ["MEDELLÍN"],
      },
    });
  });

  it("no ofrece municipios cuando no hay departamento seleccionado", async () => {
    const rows = query({ data: [], error: null, count: 0 });
    const departments = query({
      data: [{ departamento: "ANTIOQUIA" }],
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValueOnce(rows).mockReturnValueOnce(departments),
    };

    const result = await listTablaZonal(client as never);

    expect(client.from).toHaveBeenCalledTimes(2);
    expect(result.meta.municipios).toEqual([]);
  });
});
