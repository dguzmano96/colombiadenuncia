import { describe, expect, it, vi } from "vitest";
import {
  getPublicDenunciaById,
  listPublicDenuncias,
} from "./list-public-denuncias";

describe("listPublicDenuncias", () => {
  it("lee la vista denuncias_publicas, no la tabla denuncias", async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    await listPublicDenuncias({ from } as never);
    expect(from).toHaveBeenCalledWith("denuncias_publicas");
    expect(from).not.toHaveBeenCalledWith("denuncias");
  });
});

describe("getPublicDenunciaById", () => {
  it("consulta la misma vista por id e incluye relato", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    await getPublicDenunciaById({ from } as never, "abc");
    expect(from).toHaveBeenCalledWith("denuncias_publicas");
    expect(from).not.toHaveBeenCalledWith("denuncias");
    expect(select).toHaveBeenCalledWith(expect.stringContaining("relato"));
    expect(eq).toHaveBeenCalledWith("id", "abc");
  });
});
