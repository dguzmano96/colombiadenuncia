import { describe, expect, it, vi } from "vitest";
import { readMapDetalleId, writeMapDetalleId } from "./detalle-deep-link";

describe("detalle-deep-link", () => {
  it("lee id desde query", () => {
    expect(readMapDetalleId("?id=abc-1")).toBe("abc-1");
    expect(readMapDetalleId("")).toBeNull();
  });

  it("escribe y borra el query sin recargar", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "http://localhost/mapa",
        pathname: "/mapa",
        search: "",
        hash: "",
      },
      history: { replaceState },
    });
    writeMapDetalleId("xyz");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/mapa?id=xyz");
    writeMapDetalleId(null);
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/mapa");
  });
});
