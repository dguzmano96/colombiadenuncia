import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { CAPTURA_PATH, OFFLINE_FALLBACK_PATH } from "./src/pwa/precache";

const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    { url: CAPTURA_PATH, revision },
    { url: OFFLINE_FALLBACK_PATH, revision },
  ],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {};

export default withSerwist(nextConfig);
