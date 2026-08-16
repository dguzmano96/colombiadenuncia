import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "./TurnstileWidget";

describe("TurnstileWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resuelve null si siteKey está vacío", async () => {
    const handleRef = { current: null as TurnstileHandle | null };
    render(<TurnstileWidget siteKey="" handleRef={handleRef} />);
    const token = await handleRef.current?.getToken();
    expect(token).toBeNull();
  });

  it("obtiene token disponible, lo consume y dispara reset en background", async () => {
    let capturedCallback: ((token: string) => void) | undefined;
    const resetFn = vi.fn();

    window.turnstile = {
      render: (_el, opts) => {
        capturedCallback = opts.callback;
        return "widget-123";
      },
      reset: resetFn,
      getResponse: vi.fn().mockReturnValue(""),
    };

    const handleRef = { current: null as TurnstileHandle | null };
    render(<TurnstileWidget siteKey="1x00000000000000000000AA" handleRef={handleRef} />);

    // Simular que Turnstile emite token
    capturedCallback?.("token-1");

    const token1 = await handleRef.current?.getToken();
    expect(token1).toBe("token-1");
    expect(resetFn).toHaveBeenCalledWith("widget-123");

    // Segundo getToken espera nuevo token
    resetFn.mockClear();
    const token2Promise = handleRef.current?.getToken();
    capturedCallback?.("token-2");
    const token2 = await token2Promise;
    expect(token2).toBe("token-2");
  });

  it("resuelve null por timeout si el reto no responde en 10s", async () => {
    window.turnstile = {
      render: () => "widget-hang",
      reset: vi.fn(),
      getResponse: vi.fn().mockReturnValue(""),
    };

    const handleRef = { current: null as TurnstileHandle | null };
    render(<TurnstileWidget siteKey="test-key" handleRef={handleRef} />);

    const promise = handleRef.current?.getToken();
    vi.advanceTimersByTime(10_000);
    const token = await promise;
    expect(token).toBeNull();
  });

  it("resuelve null si error-callback es invocado", async () => {
    let capturedErrorCallback: (() => void) | undefined;

    window.turnstile = {
      render: (_el, opts) => {
        capturedErrorCallback = opts["error-callback"];
        return "widget-err";
      },
      reset: vi.fn(),
      getResponse: vi.fn().mockReturnValue(""),
    };

    const handleRef = { current: null as TurnstileHandle | null };
    render(<TurnstileWidget siteKey="test-key" handleRef={handleRef} />);

    const promise = handleRef.current?.getToken();
    capturedErrorCallback?.();
    const token = await promise;
    expect(token).toBeNull();
  });
});
