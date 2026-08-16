import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { SyncDrain } from "./SyncDrain";

vi.mock("@/components/sync/TurnstileWidget", () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget" />,
}));

vi.mock("@/storage/local-denuncia-store", () => ({
  listSyncQueue: vi.fn().mockResolvedValue([]),
  resumePausedQueue: vi.fn().mockResolvedValue(undefined),
}));

describe("SyncDrain", () => {
  it("drena al montar si navigator.onLine", async () => {
    const drain = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    render(<SyncDrain siteKey="public-site-key" drain={drain} />);
    await waitFor(() => expect(drain).toHaveBeenCalled());
  });

  it("drena en el evento online", async () => {
    const drain = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(<SyncDrain siteKey="public-site-key" drain={drain} />);
    expect(drain).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(drain).toHaveBeenCalled());
  });
});
