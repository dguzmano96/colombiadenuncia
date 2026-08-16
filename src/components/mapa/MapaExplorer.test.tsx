import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CATEGORIA_FILTER_KEY } from "@/mapa/filter-categoria";
import { MapaExplorer } from "./MapaExplorer";

vi.mock("./PublicMap", () => ({
  PublicMap: () => (
    <div role="application" aria-label="Mapa de denuncias públicas" />
  ),
}));

const requestCurrentPosition = vi.hoisted(() => vi.fn());
vi.mock("@/lib/request-current-position", () => ({
  requestCurrentPosition: (...args: unknown[]) =>
    requestCurrentPosition(...args),
}));

describe("MapaExplorer", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("el mapa HU-005 permanece montado sin GPS silencioso", () => {
    render(<MapaExplorer />);
    expect(screen.getByRole("application")).toBeTruthy();
    expect(screen.getByRole("button", { name: /cerca de mí/i })).toBeTruthy();
    expect(screen.getByRole("group", { name: /categorías/i })).toBeTruthy();
    expect(requestCurrentPosition).not.toHaveBeenCalled();
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
