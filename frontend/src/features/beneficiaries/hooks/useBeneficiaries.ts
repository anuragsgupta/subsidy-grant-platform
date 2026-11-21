import { useQuery } from '@tanstack/react-query';
import { beneficiaryService } from '../services/beneficiary.service';

export const beneficiaryKeys = {
  list: ['beneficiaries', 'list'] as const,
  detail: (id: string) => ['beneficiaries', 'detail', id] as const,
  byUserId: (userId: string) => ['beneficiaries', 'byUserId', userId] as const,
};

export function useBeneficiariesQuery() {
  return useQuery({
    queryKey: beneficiaryKeys.list,
    queryFn: beneficiaryService.getAll,
    staleTime: Infinity,
  });
}

export function useBeneficiaryQuery(id: string) {
  return useQuery({
    queryKey: beneficiaryKeys.detail(id),
    queryFn: () => beneficiaryService.getById(id),
    staleTime: Infinity,
  });
}

export function useBeneficiaryByUserIdQuery(userId: string) {
  return useQuery({
    queryKey: beneficiaryKeys.byUserId(userId),
    queryFn: () => beneficiaryService.getByUserId(userId),
    staleTime: Infinity,
  });
}
