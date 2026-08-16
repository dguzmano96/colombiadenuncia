"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listSyncQueue, resumePausedQueue } from "@/storage/local-denuncia-store";
import { isManuallyPaused, MAX_SYNC_ATTEMPTS } from "@/sync/backoff";
import { drainSyncQueue, postSyncDenuncia } from "@/sync/drain-queue";
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

  const refreshPaused = useCallback(async () => {
    const queue = await listSyncQueue();
    setPaused(
      queue.some(
        (item) =>
          item.intentos >= MAX_SYNC_ATTEMPTS || isManuallyPaused(item.proxima_at),
      ),
    );
  }, []);

  const runDrain = useCallback(async () => {
    await drain({
      isOnline: () => navigator.onLine,
      getTurnstileToken: async () => {
        const token = await handleRef.current?.getToken();
        return token ?? null;
      },
      resetTurnstile: () => handleRef.current?.reset(),
      postSync: postSyncDenuncia,
    });
    await refreshPaused();
  }, [drain, refreshPaused]);

  useEffect(() => {
    function onOnline() {
      void runDrain();
    }
    window.addEventListener("online", onOnline);
    if (navigator.onLine) {
      void runDrain();
    }
    void refreshPaused();
    return () => window.removeEventListener("online", onOnline);
  }, [refreshPaused, runDrain]);

  async function handleManualRetry() {
    await resumePausedQueue();
    setPaused(false);
    await runDrain();
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 pt-4" aria-live="polite">
      <TurnstileWidget siteKey={siteKey} handleRef={handleRef} />
      {paused ? (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <p role="status">
            Sincronización en pausa tras varios intentos. Reintenta con un token
            nuevo.
          </p>
          <button
            type="button"
            className="rounded-md border border-stone-400 px-3 py-2"
            onClick={() => void handleManualRetry()}
          >
            Reintentar envío
          </button>
        </div>
      ) : null}
    </section>
  );
}
