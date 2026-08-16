"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_TIMEOUT_MS = 10_000;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  getResponse?: (widgetId?: string) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type Props = {
  siteKey: string;
  onReady?: () => void;
  onValidationChange?: (validated: boolean) => void;
};

export type TurnstileHandle = {
  getToken: () => Promise<string | null>;
  reset: () => void;
};

export function TurnstileWidget({
  siteKey,
  onReady,
  onValidationChange,
  handleRef,
}: Props & { handleRef: MutableRefObject<TurnstileHandle | null> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const waitersRef = useRef<Array<(token: string | null) => void>>([]);

  const flushWaiters = useCallback((token: string | null) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const waiter of waiters) {
      waiter(token);
    }
  }, []);

  const reset = useCallback(() => {
    tokenRef.current = null;
    onValidationChange?.(false);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignora fallos de reset si el widget aún no está montado
      }
    }
  }, [onValidationChange]);

  const getToken = useCallback((): Promise<string | null> => {
    if (!siteKey) {
      return Promise.resolve(null);
    }

    // Token en memoria listo: consumirlo (token de un solo uso) y pedir background reset
    if (tokenRef.current) {
      const token = tokenRef.current;
      tokenRef.current = null;
      onValidationChange?.(false);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignora
        }
      }
      return Promise.resolve(token);
    }

    // Token actual en el widget
    const existing = widgetIdRef.current
      ? window.turnstile?.getResponse?.(widgetIdRef.current)
      : "";
    if (existing) {
      onValidationChange?.(false);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignora
        }
      }
      return Promise.resolve(existing);
    }

    // Forzar ejecución si hay widget disponible
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignora
      }
    }

    // Esperar token con timeout de seguridad para no colgar promesas
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const waiter = (token: string | null) => {
        if (timer) clearTimeout(timer);
        resolve(token);
      };
      timer = setTimeout(() => {
        waitersRef.current = waitersRef.current.filter((w) => w !== waiter);
        resolve(null);
      }, TOKEN_TIMEOUT_MS);

      waitersRef.current.push(waiter);
    });
  }, [onValidationChange, siteKey]);

  useEffect(() => {
    handleRef.current = { getToken, reset };
  }, [getToken, handleRef, reset]);

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            tokenRef.current = token;
            onValidationChange?.(Boolean(token));
            flushWaiters(token);
          },
          "expired-callback": () => {
            tokenRef.current = null;
            onValidationChange?.(false);
          },
          "error-callback": () => {
            tokenRef.current = null;
            onValidationChange?.(false);
            flushWaiters(null);
          },
        });
        onReady?.();
      } catch {
        flushWaiters(null);
      }
    }

    if (window.turnstile) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT}"]`,
    );
    const script =
      existing instanceof HTMLScriptElement
        ? existing
        : document.createElement("script");
    if (!existing) {
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    return () => {
      cancelled = true;
      script.removeEventListener("load", renderWidget);
    };
  }, [flushWaiters, onReady, onValidationChange, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[65px]"
      data-testid="turnstile-widget"
    />
  );
}
