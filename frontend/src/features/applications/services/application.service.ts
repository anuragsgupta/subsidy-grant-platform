import { apiClient } from '../../../services/api-client';
import type { PagedResponse } from '../../../types/api.types';
import type { Application, ApplicationStatus, ApplicationSummary, CreateApplicationRequest } from '../types/application.types';

async function list(page = 0, size = 100): Promise<PagedResponse<ApplicationSummary>> {
  const { data } = await apiClient.get<PagedResponse<ApplicationSummary>>('/applications', { params: { page, size } });
  return data;
}
async function get(id: string): Promise<Application> {
  const { data } = await apiClient.get<Application>(`/applications/${id}`);
  return data;
}
async function create(request: CreateApplicationRequest): Promise<Application> {
  const { data } = await apiClient.post<Application>('/applications', request);
  return data;
}
async function setStatus(id: string, status: ApplicationStatus): Promise<Application> {
  const { data } = await apiClient.patch<Application>(`/applications/${id}/status`, { status });
  return data;
}
export const applicationService = { list, get, create, setStatus };