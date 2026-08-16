import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ACERCAR_NO_DISPONIBLE } from "@/mapa/supercluster-index";
import { ClusterLeavesPanel } from "./ClusterLeavesPanel";

describe("ClusterLeavesPanel", () => {
  it("lista hasta 25 ids, paginación y acercar no disponible", async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `id-${i}`);
    const onNext = vi.fn();
    const onSelect = vi.fn();
    render(
      <ClusterLeavesPanel
        ids={ids}
        hasMore
        canZoom={false}
        onSelect={onSelect}
        onNext={onNext}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(ACERCAR_NO_DISPONIBLE)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /id-/ })).toHaveLength(25);
    await userEvent.click(screen.getByRole("button", { name: "Siguientes" }));
    expect(onNext).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "id-0" }));
    expect(onSelect).toHaveBeenCalledWith("id-0");
  });
});
