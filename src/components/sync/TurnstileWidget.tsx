"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

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
};

export type TurnstileHandle = {
  getToken: () => Promise<string | null>;
  reset: () => void;
};

export function TurnstileWidget({
  siteKey,
  onReady,
  handleRef,
}: Props & { handleRef: MutableRefObject<TurnstileHandle | null> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const waitersRef = useRef<Array<(token: string | null) => void>>([]);

  const flushWaiters = useCallback((token: string | null) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const waiter of waiters) waiter(token);
  }, []);

  const reset = useCallback(() => {
    tokenRef.current = null;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  const getToken = useCallback((): Promise<string | null> => {
    if (!siteKey) {
      return Promise.resolve(null);
    }
    if (tokenRef.current) {
      return Promise.resolve(tokenRef.current);
    }
    const existing = widgetIdRef.current
      ? window.turnstile?.getResponse?.(widgetIdRef.current)
      : "";
    if (existing) {
      tokenRef.current = existing;
      return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
      waitersRef.current.push(resolve);
    });
  }, [siteKey]);

  useEffect(() => {
    handleRef.current = { getToken, reset };
  }, [getToken, handleRef, reset]);

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          tokenRef.current = token;
          flushWaiters(token);
        },
        "expired-callback": () => {
          tokenRef.current = null;
        },
        "error-callback": () => {
          tokenRef.current = null;
          flushWaiters(null);
        },
      });
      onReady?.();
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
  }, [flushWaiters, onReady, siteKey]);

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
