import { apiClient } from '../../../services/api-client';
import type { PagedResponse } from '../../../types/api.types';
import type { Beneficiary, BeneficiaryRequest, BeneficiarySummary } from '../types/beneficiary.types';

async function list(page = 0, size = 100): Promise<PagedResponse<BeneficiarySummary>> {
  const { data } = await apiClient.get<PagedResponse<BeneficiarySummary>>('/beneficiaries', { params: { page, size } });
  return data;
}

async function get(id: string): Promise<Beneficiary> {
  const { data } = await apiClient.get<Beneficiary>(`/beneficiaries/${id}`);
  return data;
}

async function create(request: BeneficiaryRequest): Promise<Beneficiary> {
  const { data } = await apiClient.post<Beneficiary>('/beneficiaries', request);
  return data;
}

async function update(id: string, request: BeneficiaryRequest): Promise<Beneficiary> {
  const { data } = await apiClient.put<Beneficiary>(`/beneficiaries/${id}`, request);
  return data;
}

export const beneficiaryService = { list, get, create, update };