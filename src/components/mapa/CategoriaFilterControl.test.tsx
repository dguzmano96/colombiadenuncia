import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CATEGORIAS } from "@/domain/denuncia";
import { CategoriaFilterControl } from "./CategoriaFilterControl";

describe("CategoriaFilterControl", () => {
  it("muestra chips canónicos y multi-select; vacío no exige uno", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <CategoriaFilterControl selected={[]} onChange={onChange} />,
    );

    for (const categoria of CATEGORIAS) {
      expect(screen.getByRole("button", { name: categoria })).toBeTruthy();
      expect(
        screen.getByRole("button", { name: categoria }).getAttribute("aria-pressed"),
      ).toBe("false");
    }

    await user.click(screen.getByRole("button", { name: "acaparamiento" }));
    expect(onChange).toHaveBeenCalledWith(["acaparamiento"]);

    rerender(
      <CategoriaFilterControl
        selected={["acaparamiento"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "reventa" }));
    expect(onChange).toHaveBeenLastCalledWith(["acaparamiento", "reventa"]);
  });
});
