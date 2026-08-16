declare module "supercluster" {
  export type BBox = [number, number, number, number];

  export interface Options<P> {
    minZoom?: number;
    maxZoom?: number;
    minPoints?: number;
    radius?: number;
    extent?: number;
    nodeSize?: number;
    log?: boolean;
    generateId?: boolean;
    map?: (props: P) => object;
    reduce?: (accumulated: object, props: object) => void;
  }

  export interface PointFeature<P> {
    type: "Feature";
    id?: number | string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: P;
  }

  export interface ClusterProperties {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string | number;
  }

  export interface ClusterFeature<C> {
    type: "Feature";
    id?: number | string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: ClusterProperties & C;
  }

  export default class Supercluster<
    P extends object = Record<string, unknown>,
    C extends object = Record<string, unknown>,
  > {
    constructor(options?: Options<P>);
    load(points: Array<PointFeature<P>>): this;
    getClusters(
      bbox: BBox,
      zoom: number,
    ): Array<PointFeature<P> | ClusterFeature<C>>;
    getChildren(
      clusterId: number,
    ): Array<PointFeature<P> | ClusterFeature<C>>;
    getLeaves(
      clusterId: number,
      limit?: number,
      offset?: number,
    ): Array<PointFeature<P>>;
    getClusterExpansionZoom(clusterId: number): number;
  }
}
