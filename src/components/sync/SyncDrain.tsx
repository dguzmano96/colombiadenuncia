"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listSyncQueue,
  resumePausedQueue,
} from "@/storage/local-denuncia-store";
import { isManuallyPaused, MAX_SYNC_ATTEMPTS } from "@/sync/backoff";
import { drainSyncQueue, postSyncDenuncia } from "@/sync/drain-queue";
import { formatSyncError } from "@/sync/sync-error-messages";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/sync/TurnstileWidget";

type Props = {
  siteKey?: string;
  drain?: typeof drainSyncQueue;
};

export function SyncDrain({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  drain = drainSyncQueue,
}: Props) {
  const handleRef = useRef<TurnstileHandle | null>(null);
  const [paused, setPaused] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastErrorDetail, setLastErrorDetail] = useState<string | null>(null);
  const [lastErrorCodes, setLastErrorCodes] = useState<string[] | undefined>(undefined);

  const handleTurnstileValidation = useCallback((validated: boolean) => {
    window.dispatchEvent(
      new CustomEvent("colombiadenuncia:turnstile-validation", {
        detail: { validated },
      }),
    );
  }, []);

  const refreshQueueStatus = useCallback(async () => {
    const queue = await listSyncQueue();
    setPendingCount(queue.length);
    setPaused(
      queue.some(
        (item) =>
          item.intentos >= MAX_SYNC_ATTEMPTS || isManuallyPaused(item.proxima_at),
      ),
    );
    const itemWithErr = queue.find((item) => item.lastError);
    if (itemWithErr) {
      setLastError(itemWithErr.lastError ?? null);
      setLastErrorDetail(itemWithErr.lastErrorDetail ?? null);
      setLastErrorCodes(
        itemWithErr.lastErrorCode ? [itemWithErr.lastErrorCode] : undefined,
      );
    } else if (queue.length === 0) {
      setLastError(null);
      setLastErrorDetail(null);
      setLastErrorCodes(undefined);
    }
  }, []);

  const runDrain = useCallback(async () => {
    setSyncing(true);
    try {
      await drain({
        isOnline: () => navigator.onLine,
        getTurnstileToken: async () => {
          const token = await handleRef.current?.getToken();
          return token ?? null;
        },
        resetTurnstile: () => handleRef.current?.reset(),
        postSync: postSyncDenuncia,
      });
    } finally {
      setSyncing(false);
      await refreshQueueStatus();
    }
  }, [drain, refreshQueueStatus]);

  useEffect(() => {
    function onOnline() {
      void runDrain();
    }
    function onSyncRequested() {
      void runDrain();
    }
    function onSyncing() {
      setSyncing(true);
    }
    function onSynced() {
      setSyncing(false);
      void refreshQueueStatus();
    }
    function onSyncError(e: Event) {
      const custom = e as CustomEvent<{
        denunciaId?: string;
        error?: string;
        errorCodes?: string[];
        message?: string;
      }>;
      setSyncing(false);
      if (custom.detail?.error) {
        setLastError(custom.detail.error);
        setLastErrorDetail(custom.detail.message ?? null);
        setLastErrorCodes(custom.detail.errorCodes);
      }
      void refreshQueueStatus();
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("colombiadenuncia:sync", onSyncRequested);
    window.addEventListener("colombiadenuncia:syncing", onSyncing);
    window.addEventListener("colombiadenuncia:synced", onSynced);
    window.addEventListener("colombiadenuncia:sync-error", onSyncError);

    if (navigator.onLine) {
      void runDrain();
    }
    void refreshQueueStatus();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("colombiadenuncia:sync", onSyncRequested);
      window.removeEventListener("colombiadenuncia:syncing", onSyncing);
      window.removeEventListener("colombiadenuncia:synced", onSynced);
      window.removeEventListener("colombiadenuncia:sync-error", onSyncError);
    };
  }, [refreshQueueStatus, runDrain]);

  async function handleManualRetry() {
    await resumePausedQueue();
    setPaused(false);
    setLastError(null);
    setLastErrorDetail(null);
    setLastErrorCodes(undefined);
    await runDrain();
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 pt-4" aria-live="polite">
      <TurnstileWidget
        siteKey={siteKey}
        handleRef={handleRef}
        onValidationChange={handleTurnstileValidation}
      />

      {syncing && pendingCount > 0 ? (
        <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 flex items-center gap-2">
          <span className="inline-block animate-spin">⏳</span>
          <span>Sincronizando {pendingCount} denuncia(s) con el servidor…</span>
        </div>
      ) : null}

      {paused ? (
        <div className="mt-2 flex flex-col gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <p role="status" className="font-semibold">
            Sincronización en pausa tras varios intentos. Reintenta con un token nuevo.
          </p>
          {lastError ? (
            <p className="text-xs text-amber-800">
              Detalle del error: {formatSyncError(lastError, lastErrorDetail, lastErrorCodes)}
            </p>
          ) : null}
          <button
            type="button"
            className="self-start rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            onClick={() => void handleManualRetry()}
          >
            Reintentar envío
          </button>
        </div>
      ) : !syncing && lastError && pendingCount > 0 ? (
        <div className="mt-2 flex flex-col gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-900">
          <p role="alert" className="font-semibold">
            Error al sincronizar:
          </p>
          <p className="text-xs text-red-800">
            {formatSyncError(lastError, lastErrorDetail, lastErrorCodes)}
          </p>
          <button
            type="button"
            className="self-start rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            onClick={() => void handleManualRetry()}
          >
            Reintentar ahora
          </button>
        </div>
      ) : null}
    </section>
  );
}
