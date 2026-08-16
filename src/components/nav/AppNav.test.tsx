import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppNav } from "./AppNav";

describe("AppNav", () => {
  it("enlaza captura y mapa", () => {
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Captura" }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.getByRole("link", { name: "Mapa" }).getAttribute("href")).toBe(
      "/mapa",
    );
  });
});
