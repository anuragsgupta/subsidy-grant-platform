import { apiClient } from '../../../services/api-client';
import type { PagedResponse } from '../../../types/api.types';
import type { Scheme, SchemeSummary } from '../types/scheme.types';

async function list(params: { page?: number; size?: number } = {}): Promise<PagedResponse<SchemeSummary>> {
  const { data } = await apiClient.get<PagedResponse<SchemeSummary>>('/schemes', { params });
  return data;
}
async function get(id: string): Promise<Scheme> {
  const { data } = await apiClient.get<Scheme>(`/schemes/${id}`);
  return data;
}
export const schemeService = { list, get };