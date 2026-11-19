import { useQuery } from '@tanstack/react-query';
import { regionService } from '../services/region.service';
import type { RegionListParams } from '../types/region.types';

/** Query keys for the regions feature. */
export const regionKeys = {
  all: ['regions'] as const,
  list: (params?: RegionListParams) => ['regions', 'list', params ?? null] as const,
  detail: (id: number) => ['regions', 'detail', id] as const,
};

const REGIONS_STALE_TIME = 5 * 60_000; // 5 minutes — reference data

/** Cached list of regions. Reused by the region picker and the list page. */
export function useRegionsQuery(params?: RegionListParams) {
  return useQuery({
    queryKey: regionKeys.list(params),
    queryFn: () => regionService.listRegions(params),
    staleTime: REGIONS_STALE_TIME,
  });
}

export function useRegionQuery(id: number) {
  return useQuery({
    queryKey: regionKeys.detail(id),
    queryFn: () => regionService.getRegion(id),
    enabled: !!id,
  });
}
