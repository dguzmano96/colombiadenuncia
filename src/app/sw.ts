/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";
import {
  GEOJSON_CACHE_MAX_AGE_SECONDS,
  GEOJSON_CACHE_NAME,
  OFFLINE_FALLBACK_PATH,
  PUBLIC_GEOJSON_PATH,
} from "@/pwa/precache";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname === PUBLIC_GEOJSON_PATH,
      method: "GET",
      handler: new StaleWhileRevalidate({
        cacheName: GEOJSON_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: GEOJSON_CACHE_MAX_AGE_SECONDS,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_PATH,
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
