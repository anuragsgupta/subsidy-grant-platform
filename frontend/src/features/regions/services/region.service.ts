import { apiClient } from '../../../services/api-client';
import type { RegionResponse, RegionListParams } from '../types/region.types';

/**
 * Wraps the read-only region endpoints used this phase (RE1, RE2).
 * Optional params are omitted when undefined so the backend applies no filter.
 */

/** GET /api/v1/regions — any authenticated user. */
async function listRegions(params?: RegionListParams): Promise<RegionResponse[]> {
  const response = await apiClient.get<RegionResponse[]>('/regions', { params });
  return response.data;
}

/** GET /api/v1/regions/{id} */
async function getRegion(id: number): Promise<RegionResponse> {
  const response = await apiClient.get<RegionResponse>(`/regions/${id}`);
  return response.data;
}

export const regionService = { listRegions, getRegion };
