import Supercluster from "supercluster";
import type { PublicFeature, PublicFeatureProperties } from "./public-geojson";

export type LngLatBBox = [west: number, south: number, east: number, north: number];

export const CLUSTER_LEAVES_PAGE_SIZE = 25;
export const ACERCAR_NO_DISPONIBLE = "acercar no disponible";

export type PublicClusterIndex = Supercluster<PublicFeatureProperties>;

export type ClusterProperties = {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
};

export function isClusterProperties(
  props: PublicFeatureProperties | ClusterProperties | Record<string, unknown>,
): props is ClusterProperties {
  return (props as ClusterProperties).cluster === true;
}

export function createPublicClusterIndex(
  features: PublicFeature[],
): PublicClusterIndex {
  const index = new Supercluster<PublicFeatureProperties>({
    radius: 40,
    maxZoom: 16,
  });
  index.load(features);
  return index;
}

export function clustersForView(
  index: PublicClusterIndex,
  bbox: LngLatBBox,
  zoom: number,
) {
  return index.getClusters(bbox, Math.trunc(zoom));
}

export function canExpandCluster(
  index: PublicClusterIndex,
  clusterId: number,
  currentZoom: number,
  mapMaxZoom: number,
): boolean {
  const next = index.getClusterExpansionZoom(clusterId);
  return next > currentZoom && next <= mapMaxZoom;
}

export function clusterExpansionZoom(
  index: PublicClusterIndex,
  clusterId: number,
): number {
  return index.getClusterExpansionZoom(clusterId);
}

export function clusterLeavesPage(
  index: PublicClusterIndex,
  clusterId: number,
  offset = 0,
): { ids: string[]; hasMore: boolean; offset: number } {
  const peek = index.getLeaves(
    clusterId,
    CLUSTER_LEAVES_PAGE_SIZE + 1,
    offset,
  );
  const page = peek.slice(0, CLUSTER_LEAVES_PAGE_SIZE);
  const ids = page
    .map((leaf) => leaf.properties.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return {
    ids,
    hasMore: peek.length > CLUSTER_LEAVES_PAGE_SIZE,
    offset,
  };
}
