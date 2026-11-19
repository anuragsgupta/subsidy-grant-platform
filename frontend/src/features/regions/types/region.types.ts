/** Mirrors RegionType.java. */
export type RegionType = 'STATE' | 'DISTRICT';

/** Mirrors RegionResponse.java. */
export interface RegionResponse {
  id: number;
  code: string;
  name: string;
  type: RegionType;
  parentId: number | null;
}

/** Query params for GET /regions (RE1). */
export interface RegionListParams {
  type?: RegionType;
  parentId?: number;
}
