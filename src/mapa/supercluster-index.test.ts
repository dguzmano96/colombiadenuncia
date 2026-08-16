import { describe, expect, it } from "vitest";
import type { PublicFeature } from "./public-geojson";
import {
  ACERCAR_NO_DISPONIBLE,
  CLUSTER_LEAVES_PAGE_SIZE,
  canExpandCluster,
  clusterLeavesPage,
  clustersForView,
  createPublicClusterIndex,
  isClusterProperties,
} from "./supercluster-index";

function point(id: string, lon: number, lat: number): PublicFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      id,
      categoria: "acaparamiento",
      lon,
      lat,
      trust_score: 0,
      atestiguos_validos: 0,
      reportes_falsedad: 0,
    },
  };
}

describe("supercluster-index", () => {
  it("indexa con Supercluster y getClusters usa bbox [w,s,e,n] y zoom entero", () => {
    const bogota = Array.from({ length: 50 }, (_, i) =>
      point(`p${i}`, -74.08 + (i % 5) * 0.002, 4.61 + Math.floor(i / 5) * 0.002),
    );
    const index = createPublicClusterIndex(bogota);
    const clusters = clustersForView(index, [-74.2, 4.5, -73.9, 4.8], 8.7);
    expect(clusters.length).toBeGreaterThan(0);
    const cluster = clusters.find((f) => isClusterProperties(f.properties));
    expect(cluster).toBeDefined();
    if (cluster && isClusterProperties(cluster.properties)) {
      expect(cluster.properties.point_count).toBeGreaterThan(1);
    }
  });

  it("en zoom máximo un cluster residual lista máximo 25 ids y permite paginar", () => {
    const sameSpot = Array.from({ length: 40 }, (_, i) =>
      point(`same-${i}`, -74.08, 4.61),
    );
    const index = createPublicClusterIndex(sameSpot);
    const atMax = clustersForView(index, [-74.09, 4.6, -74.07, 4.62], 16);
    const cluster = atMax.find((f) => isClusterProperties(f.properties));
    expect(cluster && isClusterProperties(cluster.properties)).toBe(true);
    if (!cluster || !isClusterProperties(cluster.properties)) return;
    expect(
      canExpandCluster(index, cluster.properties.cluster_id, 16, 16),
    ).toBe(false);
    const page = clusterLeavesPage(index, cluster.properties.cluster_id, 0);
    expect(page.ids).toHaveLength(CLUSTER_LEAVES_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    const next = clusterLeavesPage(
      index,
      cluster.properties.cluster_id,
      CLUSTER_LEAVES_PAGE_SIZE,
    );
    expect(next.ids.length).toBeGreaterThan(0);
    expect(next.ids[0]).not.toBe(page.ids[0]);
    expect(ACERCAR_NO_DISPONIBLE).toMatch(/acercar no disponible/i);
  });

  it("500 features: p95 de getClusters < 300 ms (lab Node)", () => {
    const features = Array.from({ length: 500 }, (_, i) =>
      point(
        `n${i}`,
        -75 + (i % 25) * 0.04,
        3 + Math.floor(i / 25) * 0.04,
      ),
    );
    const index = createPublicClusterIndex(features);
    const samples: number[] = [];
    for (let i = 0; i < 40; i++) {
      const t0 = performance.now();
      clustersForView(index, [-76, 2, -70, 8], 6 + (i % 5));
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95) - 1] ?? samples.at(-1);
    expect(p95).toBeLessThan(300);
  });
});
